import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyDraftApproved } from '@/lib/notificationUtils';

// PUT /api/manuscripts/[id]/author-draft-approval - Author approves/rejects draft
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approval, feedback } = await request.json();

    if (typeof approval !== 'boolean') {
      return NextResponse.json({ error: 'Approval status is required' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedCopyEditor', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is the author
    if (manuscript.submittedBy._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the author can approve/reject the draft' }, { status: 403 });
    }

    // Check if draft is ready for author review
    if (manuscript.draftStatus !== 'awaiting-author-review') {
      return NextResponse.json({ error: 'Draft is not ready for author review' }, { status: 400 });
    }

    const updateData: any = {
      draftStatus: approval ? 'approved-by-author' : 'rejected-by-author',
      authorDraftApprovalDate: new Date(),
      lastModified: new Date(),
    };

    if (feedback) {
      updateData.authorDraftFeedback = feedback;
    }

    // Add timeline entry
    updateData.$push = {
      timeline: {
        event: 'author-draft-review',
        description: `Author ${approval ? 'approved' : 'rejected'} the copy-edited draft${feedback ? ` with feedback: ${feedback}` : ''}`,
        performedBy: session.user.id,
        metadata: {
          approval,
          feedback,
          performedBy: session.user.email
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    // Note: Editor notification temporarily disabled (assignedEditor field not properly populated)
    // TODO: Implement proper editor assignment and notification system
    // For now, notifications will be handled through the admin dashboard

    return NextResponse.json({
      message: `Draft ${approval ? 'approved' : 'rejected'} successfully`,
      manuscript: {
        _id: updatedManuscript._id,
        draftStatus: updatedManuscript.draftStatus,
        authorDraftApprovalDate: updatedManuscript.authorDraftApprovalDate,
        authorDraftFeedback: updatedManuscript.authorDraftFeedback
      }
    });

  } catch (error) {
    console.error('Author draft approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/author-draft-approval - Get draft approval status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .select('draftStatus draftReadyDate authorDraftApprovalDate authorDraftFeedback submittedBy title');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check permissions (author, editors, admins)
    const isAuthor = manuscript.submittedBy._id.toString() === session.user.id;
    const isEditor = session.user.role === 'editor' || session.user.role === 'admin' || session.user.role === 'copy-editor';

    if (!isAuthor && !isEditor) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({
      draftApprovalInfo: {
        draftStatus: manuscript.draftStatus,
        draftReadyDate: manuscript.draftReadyDate,
        authorDraftApprovalDate: manuscript.authorDraftApprovalDate,
        authorDraftFeedback: manuscript.authorDraftFeedback,
        canApprove: isAuthor && manuscript.draftStatus === 'awaiting-author-review'
      }
    });

  } catch (error) {
    console.error('Get draft approval info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
