import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveMessage } from '@/lib/models/ChatHistory';
import { connectToDatabase } from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

// URL for the FastAPI QA server
const QA_SERVER_URL = process.env.QA_SERVER_URL || 'http://localhost:8000';

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TALQSSSS';

/**
 * This endpoint processes legal questions using your custom Q&A model
 * It connects to the FastAPI server running your T5 QA model
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { question, documentContent, documentName, fingerprint, documentFingerprint } = await request.json();
    
    // Log the incoming request
    console.log('QA API: Received question request');
    console.log('QA API: Question:', question);
    console.log('QA API: Document fingerprint:', fingerprint || documentFingerprint);
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }
    
    // If documentContent is not provided, but we have a fingerprint, retrieve it from MongoDB
    let actualDocumentContent = documentContent;
    const docFingerprintToSearch = fingerprint || documentFingerprint;

    if (!actualDocumentContent && docFingerprintToSearch) {
      console.log('QA API: Document content not provided, fetching from MongoDB using fingerprint:', docFingerprintToSearch);
      try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();
        // Ensure we are querying the 'documents' collection as per the Document model
        const document = await db.collection('documents').findOne({ 
          fingerprint: docFingerprintToSearch 
        });
        await client.close();
        
        if (document && document.content) {
          actualDocumentContent = document.content;
          console.log(`QA API: Found document content in MongoDB, length: ${actualDocumentContent.length} chars`);
        } else {
          console.log('QA API: Document not found in MongoDB or content is missing for fingerprint:', docFingerprintToSearch);
          return NextResponse.json(
            { answer: "I don't have enough information to answer that question. The document content could not be found. Please upload the document again." },
            { status: 200 }
          );
        }
      } catch (error) {
        console.error('QA API: Error fetching document from MongoDB:', error);
        return NextResponse.json(
          { answer: "Sorry, there was an error retrieving the document. Please try again." },
          { status: 200 }
        );
      }
    } else if (!actualDocumentContent) {
      return NextResponse.json(
        { answer: "I don't have enough information to answer that question. Please upload a document first." },
        { status: 200 }
      );
    }
    
    try {
      // If it's a specific question, send it to the custom QA model
      if (question !== 'all') {
        // Single question - make a request to the FastAPI server
        console.log('QA API: Sending request to QA server');
        
        const qaResponse = await fetch(`${QA_SERVER_URL}/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: actualDocumentContent,
            question: question
          }),
        });
        
        console.log('QA API: QA server response status:', qaResponse.status);
        
        if (!qaResponse.ok) {
          throw new Error(`QA server responded with status: ${qaResponse.status}`);
        }
        
        const data = await qaResponse.json();
        
        // Save the question and answer to MongoDB
        await saveQuestionAndAnswer(request, question, data.answer, documentName, fingerprint);
        
        return NextResponse.json({
          question,
          answer: data.answer,
          documentName,
          fingerprint
        });
      } else {
        // Process all default questions at once
        const bulkResponse = await fetch(`${QA_SERVER_URL}/answer_bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: documentContent
          }),
        });
        
        if (!bulkResponse.ok) {
          throw new Error(`QA server responded with status: ${bulkResponse.status}`);
        }
        
        const bulkData = await bulkResponse.json();
        
        // For bulk answers, save each one individually
        if (bulkData.answers && Array.isArray(bulkData.answers)) {
          for (const qa of bulkData.answers) {
            await saveQuestionAndAnswer(request, qa.question, qa.answer, documentName, fingerprint);
          }
        }
        
        return NextResponse.json({
          answers: bulkData.answers,
          documentName,
          fingerprint
        });
      }
    } catch (qaError) {
      console.error('Error calling QA server:', qaError);
      
      // Fallback to extractive answering if the QA server is unavailable
      const answer = generateExtractiveAnswer(documentContent, question);
      
      // Still save fallback answers to maintain history
      await saveQuestionAndAnswer(request, question, answer, documentName, fingerprint, true);
      
      return NextResponse.json({
        question,
        answer,
        documentName,
        fingerprint,
        note: 'Using fallback method because QA server is unavailable'
      });
    }
    
  } catch (error) {
    console.error('Error processing question with custom model:', error);
    return NextResponse.json(
      { error: 'Failed to process the question with custom model' },
      { status: 500 }
    );
  }
}

/**
 * Get the default legal questions from the QA server
 */
export async function GET() {
  try {
    // Try to get questions from the QA server
    const response = await fetch(`${QA_SERVER_URL}/questions`);
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ questions: data.default_questions });
    } else {
      // Fallback to default questions if the server is unavailable
      return NextResponse.json({
        questions: [
          "Who is the petitioner in the case?",
          "Who is the respondent in the case?",
          "What is the case summary?",
          "What was the court's decision?",
          "Were there any dissenting opinions?",
          "What evidence was presented?",
          "What are the key legal issues in the case?",
          "What was the timeline of events?"
        ]
      });
    }
  } catch (error) {
    console.error('Error fetching questions from QA server:', error);
    // Fallback to default questions
    return NextResponse.json({
      questions: [
        "Who is the petitioner in the case?",
        "Who is the respondent in the case?",
        "What is the case summary?",
        "What was the court's decision?",
        "Were there any dissenting opinions?",
        "What evidence was presented?",
        "What are the key legal issues in the case?",
        "What was the timeline of events?"
      ]
    });
  }
}

/**
 * Simple extractive answering method - used as fallback when the QA server is unavailable
 */
/**
 * Helper function to extract user ID from the request using multiple authentication methods
 * This ensures consistent user identification across different login methods
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  // Try to get user from NextAuth session
  const session = await getServerSession();
  if (session?.user?.email) {
    return session.user.email;
  }
  
  // Try to get from authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decodedToken = JSON.parse(atob(authHeader.substring(7)));
      if (decodedToken.email) {
        return decodedToken.email;
      }
    } catch (e) {
      console.error('Failed to decode auth token:', e);
    }
  }
  
  // Try to get from X-User-ID header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }
  
  // Try to get from cookies
  const cookies = request.headers.get('cookie');
  const userCookie = cookies?.split(';').find(c => c.trim().startsWith('talqs_user='));
  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
      if (userData.email) {
        return userData.email;
      }
    } catch (e) {
      console.error('Failed to parse user cookie:', e);
    }
  }
  
  // Use a default user ID for testing only
  return 'anonymous@talqs.com';
}

/**
 * Helper function to save a question and its answer to the chat history in MongoDB
 */
async function saveQuestionAndAnswer(
  request: NextRequest,
  question: string,
  answer: string,
  documentName?: string,
  fingerprint?: string,
  isFallback: boolean = false
): Promise<void> {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get user ID using our helper function
    const userId = await getUserIdFromRequest(request);
    
    // Save the user's question
    await saveMessage(
      userId,
      'user',
      question,
      undefined, // documentId
      documentName,
      fingerprint
    );
    
    // Save the AI's answer
    let answerPrefix = '';
    if (isFallback) {
      answerPrefix = '[Fallback Answer] ';
    }
    
    await saveMessage(
      userId,
      'ai',
      answerPrefix + answer,
      undefined, // documentId
      documentName,
      fingerprint
    );
    
    console.log(`Saved Q&A exchange for user ${userId} and document ${fingerprint || 'unknown'}`);
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to save Q&A to chat history:', error);
  }
}

function generateExtractiveAnswer(documentContent: string, question: string): string {
  // Split document into sentences
  const sentences = documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Create a simple keyword-based matching
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => 
    w.length > 3 && !['what', 'who', 'when', 'where', 'why', 'how', 'the', 'and', 'this', 'that'].includes(w)
  );
  
  // Score each sentence based on keyword matches
  const scoredSentences = sentences.map(sentence => {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;
    
    questionWords.forEach(word => {
      if (sentenceLower.includes(word)) {
        score += 1;
      }
    });
    
    return { sentence, score };
  });
  
  // Sort by score and take top 3 sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.sentence.trim());
  
  // If no good matches, take first, middle and last sentence
  if (topSentences.length === 0) {
    return `I couldn't find a specific answer to this question in the document. Here are some key excerpts that might be helpful:\n\n${
      [
        sentences[0],
        sentences[Math.floor(sentences.length / 2)],
        sentences[sentences.length - 1]
      ].filter(Boolean).map(s => s.trim()).join('\n\n')
    }`;
  }
  
  // Format the answer
  return `Based on the document, I found this information that answers your question:\n\n${
    topSentences.join('\n\n')
  }`;
}
