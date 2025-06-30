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
    // 1. Have status 'ready-for-publication' 
    // 2. Have copyEditingStage 'author-approved' and are not yet published
    const manuscripts = await Manuscript.find({
      $or: [
        { status: 'ready-for-publication', publishedDate: { $exists: false } },
        { copyEditingStage: 'author-approved', status: { $ne: 'published' } }
      ]
    })
    .select('_id title authors copyEditingStage status lastModified submittedBy submissionDate latestManuscriptFiles authorCopyEditReview category')
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
