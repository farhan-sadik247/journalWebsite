import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET() {
  try {
    // Test environment variables
    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const hasMongoUri = !!process.env.MONGODB_URI;
    
    // Check if MongoDB URI has placeholders
    const mongoUriHasPlaceholders = process.env.MONGODB_URI?.includes('<db_username>') || 
                                   process.env.MONGODB_URI?.includes('<db_password>');

    const session = await getServerSession(authOptions);

    return NextResponse.json({
      environment: {
        hasGoogleClientId,
        hasGoogleSecret,
        hasNextAuthSecret,
        hasMongoUri,
        mongoUriHasPlaceholders,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
      session: session ? {
        user: {
          email: session.user.email,
          name: session.user.name,
          id: session.user.id,
        }
      } : null,
      message: 'Authentication test endpoint'
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
