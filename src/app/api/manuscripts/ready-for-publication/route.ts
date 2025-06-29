import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

export async function GET(
  request: NextRequest,
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only editors and admins can view manuscripts ready for publication
    if (session.user.role !== 'editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    // Find manuscripts that are either:
    // 1. In copy-editing stage 'ready-for-publication'
    // 2. Have draft status 'approved-by-author' and are not yet published
    const manuscripts = await Manuscript.find({
      $or: [
        { copyEditingStage: 'ready-for-publication', status: { $ne: 'published' } },
        { draftStatus: 'approved-by-author', status: { $ne: 'published' } }
      ]
    })
    .select('_id title authors copyEditingStage draftStatus status lastModified submittedBy')
    .populate('submittedBy', 'name email')
    .sort({ lastModified: -1 });

    return NextResponse.json({
      manuscripts
    });

  } catch (error) {
    console.error('Error fetching manuscripts ready for publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
