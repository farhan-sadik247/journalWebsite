import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { 
  notifyCopyEditorAssigned, 
  notifyDraftReady,
  notifyDraftApproved
} from '@/lib/notificationUtils';

// PUT /api/manuscripts/[id]/simple-copy-edit - Simplified copy editing workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, copyEditorId, notes } = await request.json();

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedCopyEditor', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    let updateData: any = {
      lastModified: new Date(),
    };

    switch (action) {
      case 'assign-copy-editor':
        // Only editors and admins can assign copy editors
        const userRole = session.user.currentActiveRole || session.user.role || 'author';
        const userRoles = session.user.roles || [userRole];
        const isEditor = userRole === 'editor' || userRoles.includes('editor');
        const isAdmin = userRole === 'admin' || userRoles.includes('admin');
        
        if (!isEditor && !isAdmin) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const copyEditor = await User.findById(copyEditorId);
        if (!copyEditor || (!copyEditor.roles?.includes('copy-editor') && copyEditor.role !== 'copy-editor')) {
          return NextResponse.json({ error: 'Invalid copy editor' }, { status: 400 });
        }

        updateData.assignedCopyEditor = copyEditorId;
        updateData.copyEditingStage = 'copy-editing';
        updateData.copyEditingStartDate = new Date();
        updateData.$push = {
          timeline: {
            event: 'copy-editor-assigned',
            description: `Copy editor ${copyEditor.name} assigned for copy-editing and typesetting`,
            performedBy: session.user.id,
            metadata: {
              copyEditorId,
              copyEditorName: copyEditor.name,
              copyEditorEmail: copyEditor.email
            }
          }
        };

        // Notify copy editor
        await notifyCopyEditorAssigned(
          copyEditor.email,
          params.id,
          manuscript.title,
          manuscript.submittedBy.name
        );
        break;

      case 'send-to-author':
        // Only assigned copy editor can send to author
        if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        if (manuscript.assignedCopyEditor?.toString() !== session.user.id && session.user.role !== 'admin') {
          return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
        }

        updateData.copyEditingStage = 'author-review';
        updateData.copyEditingCompletedDate = new Date();
        if (notes) {
          updateData.copyEditingNotes = notes;
        }
        updateData.$push = {
          timeline: {
            event: 'copy-editing-completed',
            description: 'Copy-editing and typesetting completed, sent to author for final review',
            performedBy: session.user.id,
            metadata: {
              notes: notes || '',
              copyEditorName: session.user.name
            }
          }
        };

        // Notify author
        await notifyDraftReady(
          manuscript.submittedBy.email,
          params.id,
          manuscript.title
        );
        break;

      case 'author-approve':
        // Only the manuscript author can approve
        if (manuscript.submittedBy._id.toString() !== session.user.id) {
          return NextResponse.json({ error: 'Only the manuscript author can approve' }, { status: 403 });
        }

        updateData.copyEditingStage = 'ready-for-production';
        updateData['authorCopyEditReview.approved'] = true;
        updateData['authorCopyEditReview.reviewedAt'] = new Date();
        updateData['authorCopyEditReview.reviewedBy'] = session.user.id;
        updateData.$push = {
          timeline: {
            event: 'author-approved-copy-edit',
            description: 'Author approved the copy-edited manuscript for production',
            performedBy: session.user.id,
            metadata: {
              authorName: session.user.name
            }
          }
        };

        // Notify editor that manuscript is ready for production
        // Find the editor assigned to this manuscript or any editor
        const editors = await User.find({ role: { $in: ['editor', 'admin'] } });
        if (editors.length > 0) {
          for (const editor of editors) {
            await notifyDraftApproved(
              editor.email,
              params.id,
              manuscript.title,
              session.user.name || 'Author'
            );
          }
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('assignedCopyEditor', 'name email');

    return NextResponse.json({
      message: 'Copy editing action completed successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error in simple copy edit workflow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/simple-copy-edit - Get simple copy editing status
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
      .populate('assignedCopyEditor', 'name email')
      .populate('submittedBy', 'name email')
      .select('copyEditingStage copyEditingStartDate copyEditingCompletedDate copyEditingNotes assignedCopyEditor submittedBy title authorCopyEditReview');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check permissions
    const isAuthor = manuscript.submittedBy._id.toString() === session.user.id;
    const isCopyEditor = session.user.role === 'copy-editor';
    const isEditor = session.user.role === 'editor' || session.user.role === 'admin';

    if (!isAuthor && !isCopyEditor && !isEditor) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({
      copyEditingInfo: {
        stage: manuscript.copyEditingStage,
        assignedCopyEditor: manuscript.assignedCopyEditor,
        startDate: manuscript.copyEditingStartDate,
        completedDate: manuscript.copyEditingCompletedDate,
        notes: manuscript.copyEditingNotes,
        authorReview: manuscript.authorCopyEditReview
      }
    });

  } catch (error) {
    console.error('Error getting simple copy edit status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
