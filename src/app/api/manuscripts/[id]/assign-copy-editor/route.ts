import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { notifyCopyEditorAssigned } from '@/lib/notificationUtils';

// POST /api/manuscripts/[id]/assign-copy-editor - Assign copy editor to manuscript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (editor or admin)
    if (!session.user.roles?.includes('editor') && !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { copyEditorId, dueDate, notes } = await request.json();

    if (!copyEditorId) {
      return NextResponse.json({ error: 'Copy editor ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Verify manuscript exists and is in the right state
    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if manuscript is in accepted state or already in copy-editing pipeline
    const validStatuses = ['accepted', 'accepted-awaiting-copy-edit', 'in-copy-editing'];
    if (!validStatuses.includes(manuscript.status)) {
      return NextResponse.json({ 
        error: 'Manuscript must be accepted before assigning copy editor' 
      }, { status: 400 });
    }

    // Verify copy editor exists and has copy-editor role
    const copyEditor = await User.findById(copyEditorId);
    if (!copyEditor) {
      return NextResponse.json({ error: 'Copy editor not found' }, { status: 404 });
    }

    if (!copyEditor.roles?.includes('copy-editor') && copyEditor.role !== 'copy-editor') {
      return NextResponse.json({ error: 'User is not a copy editor' }, { status: 400 });
    }

    // Check if payment is completed (if required)
    if (manuscript.requiresPayment && manuscript.paymentStatus !== 'completed' && manuscript.paymentStatus !== 'waived') {
      const payment = await Payment.findOne({ 
        manuscriptId: params.id, 
        status: { $in: ['completed', 'waived'] }
      });
      
      if (!payment) {
        return NextResponse.json({ 
          error: 'Payment must be completed before copy-editing assignment' 
        }, { status: 400 });
      }
    }

    // Update manuscript with copy editor assignment
    const updateData: any = {
      assignedCopyEditor: copyEditorId,
      copyEditingStage: 'copy-editing',
      copyEditingStartDate: new Date(),
      status: manuscript.status === 'accepted' ? 'accepted-awaiting-copy-edit' : manuscript.status,
      lastModified: new Date(),
    };

    if (dueDate) {
      updateData.copyEditingDueDate = new Date(dueDate);
    }

    if (notes) {
      updateData.copyEditingNotes = notes;
    }

    // Add timeline entry
    updateData.$push = {
      timeline: {
        event: 'copy-editor-assigned',
        description: `Copy editor ${copyEditor.name} assigned to manuscript`,
        performedBy: session.user.id,
        metadata: {
          copyEditorId,
          copyEditorName: copyEditor.name,
          copyEditorEmail: copyEditor.email,
          dueDate,
          notes,
          assignedBy: session.user.email
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('assignedCopyEditor submittedBy', 'name email');

    // Send notification email to copy editor
    try {
      await notifyCopyEditorAssigned(
        copyEditor.email,
        params.id,
        manuscript.title,
        manuscript.submittedBy.name
      );
    } catch (emailError) {
      console.log('Email notification failed (non-critical):', emailError);
    }

    return NextResponse.json({
      message: 'Copy editor assigned successfully',
      manuscript: {
        _id: updatedManuscript._id,
        title: updatedManuscript.title,
        assignedCopyEditor: updatedManuscript.assignedCopyEditor,
        copyEditingStage: updatedManuscript.copyEditingStage,
        copyEditingStartDate: updatedManuscript.copyEditingStartDate,
        copyEditingDueDate: updatedManuscript.copyEditingDueDate,
        status: updatedManuscript.status
      }
    });

  } catch (error) {
    console.error('Error assigning copy editor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/assign-copy-editor - Get current copy editor assignment
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
      .select('assignedCopyEditor copyEditingStage copyEditingStartDate copyEditingDueDate copyEditingNotes status');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    return NextResponse.json({
      assignment: {
        assignedCopyEditor: manuscript.assignedCopyEditor,
        copyEditingStage: manuscript.copyEditingStage,
        copyEditingStartDate: manuscript.copyEditingStartDate,
        copyEditingDueDate: manuscript.copyEditingDueDate,
        copyEditingNotes: manuscript.copyEditingNotes,
        status: manuscript.status
      }
    });

  } catch (error) {
    console.error('Error fetching copy editor assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
