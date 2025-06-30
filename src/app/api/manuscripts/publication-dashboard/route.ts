import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only editors and admins can access the publication dashboard
    const userRole = session.user.currentActiveRole || session.user.role;
    const userRoles = session.user.roles || [userRole];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    if (!isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    // Get all manuscripts that are relevant for publication workflow
    const manuscripts = await Manuscript.find({
      $or: [
        { status: 'ready-for-publication' },
        { status: 'published' },
        { status: 'in-production' },
        { copyEditingStage: 'author-approved' },
        { status: 'copy-editing-complete' }
      ]
    })
    .select('_id title authors status copyEditingStage submissionDate lastModified publishedDate category doi volume issue pages latestManuscriptFiles authorCopyEditReview timeline')
    .populate('submittedBy', 'name email')
    .sort({ lastModified: -1 })
    .lean();

    console.log('Publication Dashboard API - Found manuscripts:', {
      total: manuscripts.length,
      byStatus: manuscripts.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCopyEditingStage: manuscripts.reduce((acc, m) => {
        if (m.copyEditingStage) {
          acc[m.copyEditingStage] = (acc[m.copyEditingStage] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    });

    return NextResponse.json({
      manuscripts,
      debug: {
        userRole,
        userRoles,
        isEditor,
        isAdmin,
        totalFound: manuscripts.length
      }
    });

  } catch (error) {
    console.error('Error fetching publication dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
