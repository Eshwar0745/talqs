import os
import math
import urllib.request
import torch
import torch.nn as nn
from typing import Optional
from transformers import T5Tokenizer, T5ForConditionalGeneration
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class CustomEncoderDecoderSummarizer(nn.Module):
    def __init__(self, pretrained_model_name="t5-base", d_model=768):
        super().__init__()
        from transformers import T5ForConditionalGeneration
        self.t5 = T5ForConditionalGeneration.from_pretrained(pretrained_model_name)
        self.encoder = self.t5.encoder
        self.decoder = self.t5.decoder
        self.d_model = d_model
        self.fc = nn.Linear(self.encoder.config.d_model, d_model)
        self.positional_encoding = self._get_positional_encoding(d_model)

    def _get_positional_encoding(self, d_model, max_len=512):
        pos_encoding = torch.zeros(max_len, d_model)
        for pos in range(max_len):
            for i in range(0, d_model, 2):
                pos_encoding[pos, i] = math.sin(pos / (10000 ** (i / d_model)))
                if i + 1 < d_model:
                    pos_encoding[pos, i + 1] = math.cos(pos / (10000 ** (i / d_model)))
        return pos_encoding

    def forward(self, input_ids, decoder_input_ids=None, attention_mask=None, labels=None):
        encoder_outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        encoder_hidden_states = encoder_outputs.last_hidden_state
        # You commented out positional encoding usage during training, so no need here
        return self.t5(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels,
            decoder_input_ids=decoder_input_ids
        )

"""Summarization FastAPI server (T5)
- Loads base T5 model; optionally loads fine-tuned weights from MODEL_PATH.
- If MODEL_URL is set and MODEL_PATH is missing, downloads weights at startup.
- Listens on PORT env var (default 8001).
"""

# Setup device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize FastAPI app
app = FastAPI()

# CORS
frontend_origin = os.environ.get("FRONTEND_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if we should use a simple model (faster but lower quality)
USE_SIMPLE_MODEL = True

# Initialize tokenizer and base model
try:
    print("Loading tokenizer...")
    tokenizer = T5Tokenizer.from_pretrained("t5-small" if USE_SIMPLE_MODEL else "t5-base")
    print("Successfully loaded T5Tokenizer")

    print("Loading model...")
    base_model_name = "t5-small" if USE_SIMPLE_MODEL else "t5-base"
    base_model = T5ForConditionalGeneration.from_pretrained(base_model_name)
    base_model.eval()
    print("Base T5 model loaded successfully")
except Exception as e:
    print(f"Error loading base model/tokenizer: {str(e)}")
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("t5-base", use_fast=True)
    base_model = T5ForConditionalGeneration.from_pretrained("t5-base")
    base_model.eval()
    print("Using AutoTokenizer and base T5 as fallback")

# Wrap base model in our custom module and try to load fine-tuned weights
model = CustomEncoderDecoderSummarizer(pretrained_model_name="t5-base").to(device)

# Resolve model path under project root unless MODEL_PATH is provided
# Prefer a model inside the backend folder by default (user provided path)
default_model_path = os.path.join(os.path.dirname(__file__), "model_weight.pth")
model_path = os.environ.get("MODEL_PATH", default_model_path)
model_url = os.environ.get("MODEL_URL")

def ensure_weights(path: str, url: Optional[str]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path) and url:
        try:
            print(f"Downloading model weights from {url} to {path}...")
            urllib.request.urlretrieve(url, path)
            print("Download complete.")
        except Exception as e:
            print(f"Failed to download weights: {e}")

ensure_weights(model_path, model_url)

if os.path.exists(model_path):
    try:
        model.load_state_dict(torch.load(model_path, map_location=device))
        print(f"Loaded fine-tuned weights from: {model_path}")
    except Exception as e:
        print(f"Failed to load fine-tuned weights from '{model_path}': {e}")
        print("Continuing with base T5 weights.")
else:
    print(f"Model weights not found at '{model_path}'. Continuing with base T5 weights (no fine-tuned checkpoint).")

model.eval()

# Pydantic model for request body validation
class SummaryRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    min_length: Optional[int] = 30

@app.post("/summarize")
async def summarize(request: SummaryRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
            
        print(f"Received summarization request (text length: {len(request.text)})")
        
        # Tokenize input text with a summarization prefix
        inputs = tokenizer("summarize: " + request.text, 
                         return_tensors="pt", 
                         max_length=512, 
                         truncation=True)
        
        # Generate summary
        summary_ids = model.t5.generate(
            inputs.input_ids.to(device),
            max_length=request.max_length,
            min_length=request.min_length,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        
        # Decode and return summary
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        print(f"Generated summary (length: {len(summary)})")
        return {"summary": summary}
        
    except Exception as e:
        print(f"Error in summarization: {str(e)}")
        # Fallback to simple summarization if model fails
        words = request.text.split()
        if len(words) > 100:
            summary = " ".join(words[:100]) + "... [Summary truncated]"
        else:
            summary = request.text
        return {"summary": summary, "warning": "Using fallback summarization"}

# Health endpoint
@app.get("/health")
def health():
    return {"status": "ok"}

# Start the server if this file is run directly
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8001"))
    print(f"Starting summarization server on port {port}...")
    print(f"Using {'simple' if USE_SIMPLE_MODEL else 'full'} model")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")