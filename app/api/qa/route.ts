import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveMessage } from '@/lib/models/ChatHistory';
import { getUserId } from '@/lib/user-utils';

// URL for the FastAPI QA server
const QA_SERVER_URL = process.env.QA_SERVER_URL || 'http://localhost:8000';

/**
 * This endpoint processes legal questions using your custom Q&A model
 * It connects to the FastAPI server running your T5 QA model
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { question, documentFingerprint, documentName } = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }
    
    // Get the document content from our database based on fingerprint
    let documentContent = '';
    
    try {
      // Directly access MongoDB to get document content
      if (documentFingerprint) {
        console.log(`Fetching document with fingerprint: ${documentFingerprint}`);
        
        // Import the MongoClient to access collections directly
        const { MongoClient } = await import('mongodb');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/TALQSSSS';
        const client = new MongoClient(uri);
        
        try {
          await client.connect();
          const database = client.db();
          const collection = database.collection('documents');
          
          // Find document by fingerprint
          const document = await collection.findOne({ fingerprint: documentFingerprint });
          
          if (document && document.content) {
            documentContent = document.content;
            console.log(`Found document content for fingerprint: ${documentFingerprint}, length: ${documentContent.length} chars`);
          } else {
            console.log(`Document with fingerprint ${documentFingerprint} not found in database`);
          }
        } finally {
          // Close the connection when done
          await client.close();
        }
      } else {
        console.log('No document fingerprint provided');
      }
    } catch (error) {
      console.error('Error fetching document content:', error);
    }
    
    if (!documentContent) {
      return NextResponse.json(
        { answer: "I don't have enough information to answer that question. Please upload a document first." },
        { status: 200 }
      );
    }
    
    try {
      // Send question to the custom QA model
      console.log(`Sending question to QA server: ${question}`);
      console.log(`Document length: ${documentContent.length} characters`);
      
      const qaResponse = await fetch(`${QA_SERVER_URL}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: documentContent,
          question: question
        }),
      });
      
      if (!qaResponse.ok) {
        throw new Error(`QA server responded with status: ${qaResponse.status}`);
      }
      
      const data = await qaResponse.json();
      console.log(`QA server response:`, data);
      
      // Save the question and answer to history
      const userId = getUserId();
      if (userId) {
        try {
          // Call saveMessage with the correct parameter order
          await saveMessage(
            userId,            // userId
            'user',            // role
            question,          // content
            undefined,         // documentId (optional)
            documentName,     // documentName (optional)
            documentFingerprint // documentFingerprint (optional)
          );
          
          await saveMessage(
            userId,            // userId
            'ai',              // role
            data.answer,       // content
            undefined,         // documentId (optional)
            documentName,     // documentName (optional)
            documentFingerprint // documentFingerprint (optional)
          );
          
          console.log('Successfully saved Q&A to chat history');
        } catch (saveError) {
          console.error('Error saving Q&A to history:', saveError);
        }
      } else {
        console.log('No user ID available, skipping chat history save');
      }
      
      return NextResponse.json({ answer: data.answer });
      
    } catch (error) {
      console.error('Error querying QA server:', error);
      return NextResponse.json(
        { answer: "I'm sorry, I couldn't process your question. Please try again later." },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in QA API route:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
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