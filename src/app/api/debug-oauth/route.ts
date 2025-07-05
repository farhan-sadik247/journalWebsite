// OAuth Debug Endpoint - Temporary for testing
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    baseUrl: process.env.DOMAIN_BASE_URL,
  };

  const expectedCallbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;

  return NextResponse.json({
    message: 'OAuth Configuration Debug',
    config,
    expectedCallbackUrl,
    instructions: [
      '1. Go to Google Cloud Console',
      '2. APIs & Services → Credentials',
      '3. Edit OAuth 2.0 Client ID',
      '4. Add to Authorized redirect URIs: ' + expectedCallbackUrl,
      '5. Add to Authorized JavaScript origins: ' + process.env.NEXTAUTH_URL,
      '6. Save and wait 5-10 minutes for changes to propagate'
    ]
  });
}
