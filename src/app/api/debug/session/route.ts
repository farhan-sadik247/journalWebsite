import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Server-side session debug',
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          roles: session.user.roles,
          currentActiveRole: session.user.currentActiveRole,
          isFounder: session.user.isFounder
        }
      }
    });

  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json(
      { error: 'Failed to get session info' },
      { status: 500 }
    );
  }
}
