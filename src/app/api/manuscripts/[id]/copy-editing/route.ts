import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { 
  notifyCopyEditorAssigned, 
  notifyDraftReady, 
  notifyPaymentConfirmed,
  notifyDraftApproved,
  notifyCopyEditChangesRequested
} from '@/lib/notificationUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is copy-editor or admin
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { stage, notes, copyEditorId } = await request.json();

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedEditor', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Update manuscript with copy editing information
    const updateData: any = {
      copyEditingStage: stage,
      lastModified: new Date(),
    };

    // Handle different stages
    switch (stage) {
      case 'assign-copy-editor':
        if (!copyEditorId) {
          return NextResponse.json({ error: 'Copy editor ID required for assignment' }, { status: 400 });
        }
        
        const copyEditor = await User.findById(copyEditorId);
        if (!copyEditor || copyEditor.role !== 'copy-editor') {
          return NextResponse.json({ error: 'Invalid copy editor' }, { status: 400 });
        }

        updateData.assignedCopyEditor = copyEditorId;
        updateData.copyEditingStartDate = new Date();
        
        // Check if payment is confirmed before assigning copy editor
        const payment = await Payment.findOne({ manuscriptId: params.id, status: 'completed' });
        if (!payment) {
          return NextResponse.json({ error: 'Payment must be completed before copy-editing assignment' }, { status: 400 });
        }

        // Notify copy editor of assignment
        await notifyCopyEditorAssigned(
          copyEditor.email,
          params.id,
          manuscript.title,
          manuscript.submittedBy.name
        );
        
        // Notify author that copy-editing has begun
        await notifyPaymentConfirmed(
          manuscript.submittedBy.email,
          params.id,
          manuscript.title,
          payment._id.toString()
        );
        break;

      case 'copy-editing':
        updateData.copyEditingNotes = notes;
        break;

      case 'typesetting':
        updateData.typesettingNotes = notes;
        break;

      case 'draft-ready':
        updateData.copyEditingCompletedDate = new Date();
        updateData.draftReadyDate = new Date();
        updateData.draftStatus = 'awaiting-author-review';
        
        if (notes) {
          updateData.draftNotes = notes;
        }

        // Notify author that draft is ready for review
        await notifyDraftReady(
          manuscript.submittedBy.email,
          params.id,
          manuscript.title
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Add timeline entry
    updateData.$push = {
      timeline: {
        event: 'copy-editing-update',
        description: `Copy-editing stage updated to: ${stage}${notes ? ` (${notes})` : ''}`,
        performedBy: session.user.id,
        metadata: {
          stage,
          notes,
          copyEditorId,
          performedBy: session.user.email
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('assignedCopyEditor', 'name email');

    return NextResponse.json({
      message: 'Copy editing stage updated successfully',
      manuscript: {
        _id: updatedManuscript._id,
        copyEditingStage: updatedManuscript.copyEditingStage,
        assignedCopyEditor: updatedManuscript.assignedCopyEditor,
        draftStatus: updatedManuscript.draftStatus,
        copyEditingStartDate: updatedManuscript.copyEditingStartDate,
        copyEditingCompletedDate: updatedManuscript.copyEditingCompletedDate,
        draftReadyDate: updatedManuscript.draftReadyDate
      }
    });

  } catch (error) {
    console.error('Copy editing update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/copy-editing - Get copy editing status
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
      .select('copyEditingStage copyEditingStartDate copyEditingCompletedDate draftReadyDate draftStatus copyEditingNotes typesettingNotes draftNotes assignedCopyEditor submittedBy title');

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
        draftReadyDate: manuscript.draftReadyDate,
        draftStatus: manuscript.draftStatus,
        notes: {
          copyEditing: manuscript.copyEditingNotes,
          typesetting: manuscript.typesettingNotes,
          draft: manuscript.draftNotes
        }
      }
    });

  } catch (error) {
    console.error('Get copy editing info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, approval, comments } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedEditor', 'name email')
      .populate('assignedCopyEditor', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is the author
    const isAuthor = manuscript.submittedBy._id.toString() === session.user.id;
    if (!isAuthor && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the author can approve drafts' }, { status: 403 });
    }

    if (action === 'author-review') {
      if (!approval) {
        return NextResponse.json({ error: 'Approval status is required' }, { status: 400 });
      }

      if (approval === 'needs_changes' && !comments) {
        return NextResponse.json({ error: 'Comments are required when requesting changes' }, { status: 400 });
      }

      // Update manuscript with author review
      const updateData: any = {
        authorCopyEditReview: {
          approval,
          comments: comments || '',
          reviewedBy: session.user.id,
          reviewDate: new Date()
        },
        lastModified: new Date(),
      };

      // If approved, update status to indicate it's ready for publication
      if (approval === 'approved') {
        updateData.draftStatus = 'approved-by-author';
        updateData.copyEditingStage = 'final-review';
        
        // Notify editor that the draft is approved and ready for publication
        if (manuscript.assignedEditor) {
          await notifyDraftApproved(
            manuscript.assignedEditor.email,
            params.id,
            manuscript.title,
            manuscript.submittedBy.name
          );
        }
      } else {
        // If changes requested, update status and notify copy editor
        updateData.draftStatus = 'changes-requested';
        updateData.copyEditingStage = 'revision';
        
        // Notify copy editor that changes are requested
        if (manuscript.assignedCopyEditor) {
          await notifyCopyEditChangesRequested(
            manuscript.assignedCopyEditor.email,
            params.id,
            manuscript.title,
            comments
          );
        }
      }

      // Add timeline entry
      updateData.$push = {
        timeline: {
          event: 'draft-review',
          description: approval === 'approved' 
            ? 'Author approved the copy-edited draft'
            : 'Author requested changes to the copy-edited draft',
          performedBy: session.user.id,
          metadata: {
            approval,
            comments,
            performedBy: session.user.email
          }
        }
      };

      const updatedManuscript = await Manuscript.findByIdAndUpdate(
        params.id,
        updateData,
        { new: true }
      );

      return NextResponse.json({
        message: 'Draft review submitted successfully',
        status: updatedManuscript.draftStatus
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Draft review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
