import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveDocument } from '@/lib/models/Document';
import { generateFingerprint } from '@/lib/document-utils'; // For generating fingerprint if not provided

// In-memory store is no longer used; documents are saved to MongoDB.

// Helper functions based on the provided Python code
function cleanText(text: string): string {
  // "Preserve legal references, remove extra whitespace, and fix formatting."
  return text.trim().split(/\s+/).join(" ");
}

function chunkText(text: string, maxChunkLength: number = 1000): string[] {
  // Break text into logical chunks (simplified version)
  const sentences = text.split(". ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const sentenceLength = sentence.split(/\s+/).length;
    
    if (currentLength + sentenceLength > maxChunkLength) {
      chunks.push(currentChunk.join(". ") + ".");
      currentChunk = [];
      currentLength = 0;
    }
    
    currentChunk.push(sentence);
    currentLength += sentenceLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(". ") + ".");
  }

  return chunks;
}

async function summarizeChunks(chunks: string[]): Promise<string[]> {
  try {
    // Call the actual backend summarization server for each chunk
    const summaries = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch('http://localhost:8001/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: chunk }),
        });

        if (!response.ok) {
          throw new Error(`Summarization server error: ${response.status}`);
        }

        const data = await response.json();
        return data.summary;
      })
    );

    return summaries;
  } catch (error) {
    console.error('Error calling summarization server:', error);
    // Fallback to a simple extractive summary if the server call fails
    return chunks.map(chunk => {
      const sentences = chunk.split(". ");
      if (sentences.length <= 2) return chunk;
      
      const firstSentence = sentences[0];
      const middleSentence = sentences[Math.floor(sentences.length / 2)];
      
      return `${firstSentence}. ${middleSentence}.`;
    });
  }
}

function refineSummary(summary: string): string {
  // "Refine summary by removing redundant phrases and ensuring clarity."
  const unwantedPhrases = ["the following", "as follows", "in summary", "this means that"];
  let refinedSummary = summary;
  
  for (const phrase of unwantedPhrases) {
    refinedSummary = refinedSummary.replace(new RegExp(phrase, 'gi'), "");
  }
  
  return refinedSummary.trim();
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file type
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'Only .txt files are supported' },
        { status: 400 }
      );
    }
    
    // Read the text content
    const fullText = await file.text();
    
    if (fullText.trim().length === 0) {
      return NextResponse.json(
        { error: 'The file is empty' },
        { status: 400 }
      );
    }
    
    // Get or generate document fingerprint
    let fingerprint = formData.get('fingerprint') as string | null;
    if (!fingerprint) {
      console.log('Summarize API: Fingerprint not provided, generating from content.');
      fingerprint = generateFingerprint(fullText);
    }

    // Get user ID for associating the document
    const session = await getServerSession(); // Call without authOptions
    let userId = session?.user?.email; // Prefer email from session

    if (!userId) {
      const userIdHeader = request.headers.get('X-User-ID');
      if (userIdHeader) {
        userId = userIdHeader;
        console.log('Summarize API: User identified via X-User-ID header:', userId);
      } else {
        console.error('Summarize API: User ID not found. Cannot save document.');
        // Potentially fall back to a generic user or handle error, for now, log and proceed without user association if critical
        // For robust implementation, user ID should be mandatory here.
        // Returning an error if no user ID:
        return NextResponse.json({ error: 'User identification failed. Cannot process document.' }, { status: 401 });
      }
    }

    // Save document content to MongoDB
    try {
      console.log(`Summarize API: Saving document to MongoDB. User: ${userId}, Fingerprint: ${fingerprint}`);
      await saveDocument(userId, fingerprint, file.name, file.size, fullText);
      console.log('Summarize API: Document saved to MongoDB successfully.');
    } catch (dbError) {
      console.error('Summarize API: Error saving document to MongoDB:', dbError);
      // Decide if this error is critical enough to stop processing
      // For now, we'll log it and continue with summarization, but QA might fail if DB save fails.
      // return NextResponse.json({ error: 'Failed to save document to database' }, { status: 500 });
    }
    
    // Process the text using the functions from the provided Python code
    const cleanedText = cleanText(fullText);
    
    // Check if the text is too short
    if (cleanedText.split(/\s+/).length < 100) {
      return NextResponse.json(
        { error: 'Text is too short for meaningful summarization' },
        { status: 400 }
      );
    }
    
    // Generate chunks
    const chunks = chunkText(cleanedText);
    
    // Generate summaries for each chunk using the backend server
    const summaries = await summarizeChunks(chunks);
    
    // Refine and combine summaries
    const finalSummary = summaries.map(s => refineSummary(s)).join("\n\n");
    
    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      summary: `### Structured Legal Summary ###\n${finalSummary}`,
      originalTextPreview: cleanedText.substring(0, 300) + (cleanedText.length > 300 ? '...' : '')
    });
    
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process the file' },
      { status: 500 }
    );
  }
}

// getStoredDocument is no longer needed as content is fetched from MongoDB by the QA API.
