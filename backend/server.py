import torch
from transformers import T5Tokenizer
from fastapi import FastAPI
from pydantic import BaseModel

# Paste your CustomEncoderDecoderSummarizer class here or import it if you have in a separate file
import math
import torch.nn as nn

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

# Setup device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load tokenizer and model
# Using a different tokenizer approach that doesn't require SentencePiece
try:
    from transformers import T5Tokenizer
    tokenizer = T5Tokenizer.from_pretrained("t5-base")
    print("Successfully loaded T5Tokenizer")
except ImportError:
    # Fall back to a simpler tokenizer
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("t5-base", use_fast=True)
    print("Using AutoTokenizer as fallback")

model = CustomEncoderDecoderSummarizer(pretrained_model_name="t5-base").to(device)
model.load_state_dict(torch.load("models/summary_model/model_weight.pth", map_location=device))
model.eval()

# Setup FastAPI app
app = FastAPI()

# Pydantic model for request body validation
class SummaryRequest(BaseModel):
    text: str

@app.post("/summarize")
def summarize(request: SummaryRequest):
    input_text = "summarize: " + request.text
    input_ids = tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True).to(device)

    with torch.no_grad():
        summary_ids = model.t5.generate(
            input_ids=input_ids,
            max_length=500,
            num_beams=4,
            no_repeat_ngram_size=2,
            repetition_penalty=1.5,
            length_penalty=1.0,
            early_stopping=True,
        )
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return {"summary": summary}

# Start the server if this file is run directly
if __name__ == "__main__":
    import uvicorn
    print("Starting summarization server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
