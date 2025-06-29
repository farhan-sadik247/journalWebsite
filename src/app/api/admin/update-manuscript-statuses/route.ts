import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import updateManuscriptStatuses from '@/scripts/update-manuscript-statuses';

// POST /api/admin/update-manuscript-statuses - Manually update manuscript statuses
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin users to run this
    if (!session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Admin triggered manuscript status update:', session.user.email);
    
    await updateManuscriptStatuses();
    
    return NextResponse.json({ 
      message: 'Manuscript statuses updated successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in manuscript status update API:', error);
    return NextResponse.json(
      { error: 'Failed to update manuscript statuses' },
      { status: 500 }
    );
  }
}
