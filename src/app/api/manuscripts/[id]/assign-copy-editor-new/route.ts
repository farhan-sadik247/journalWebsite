import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectDB from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { notifyCopyEditorAssigned } from '@/lib/notificationUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is editor or admin
    const userRole = session.user.currentActiveRole || session.user.role;
    const userRoles = session.user.roles || [userRole];
    
    if (!userRoles.includes('editor') && !userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { copyEditorId, dueDate, notes } = await request.json();

    if (!copyEditorId) {
      return NextResponse.json({ error: 'Copy editor ID is required' }, { status: 400 });
    }

    // Fetch manuscript
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if manuscript is in acceptable status for copy editing
    if (!['accepted', 'accepted-awaiting-copy-edit'].includes(manuscript.status)) {
      return NextResponse.json({ 
        error: 'Manuscript must be accepted before copy editing assignment' 
      }, { status: 400 });
    }

    // Fetch copy editor details
    const copyEditor = await User.findById(copyEditorId);
    if (!copyEditor) {
      return NextResponse.json({ error: 'Copy editor not found' }, { status: 404 });
    }

    // Check if copy editor has the right role
    const copyEditorRoles = copyEditor.roles || [copyEditor.role];
    if (!copyEditorRoles.includes('copy-editor')) {
      return NextResponse.json({ 
        error: 'Selected user is not a copy editor' 
      }, { status: 400 });
    }

    // Update manuscript with copy editor assignment
    const updateData = {
      copyEditorAssignment: {
        copyEditorId: copyEditor._id,
        copyEditorName: copyEditor.name,
        copyEditorEmail: copyEditor.email,
        assignedBy: session.user.id,
        assignedByName: session.user.name,
        assignedDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'assigned',
        notes: notes || '',
      },
      assignedCopyEditor: copyEditor._id,
      copyEditingStage: 'copy-editing',
      copyEditingStartDate: new Date(),
      status: 'in-copy-editing',
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('copyEditorAssignment.copyEditorId', 'name email')
     .populate('copyEditorAssignment.assignedBy', 'name email');

    // Send notification email to copy editor
    try {
      await sendEmail({
        to: copyEditor.email,
        subject: `New Copy Editing Assignment: ${manuscript.title}`,
        html: `
          <h2>New Copy Editing Assignment</h2>
          <p>Dear ${copyEditor.name},</p>
          <p>You have been assigned to copy edit the following manuscript:</p>
          <h3>${manuscript.title}</h3>
          <p><strong>Assigned by:</strong> ${session.user.name}</p>
          <p><strong>Assignment Date:</strong> ${new Date().toLocaleDateString()}</p>
          ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          <p>Please log in to the system to begin your copy editing work.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor">View Assignment</a></p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the assignment if email fails
    }

    // Create in-app notification
    try {
      await notifyCopyEditorAssigned(
        copyEditor.email,
        manuscript._id.toString(),
        manuscript.title,
        session.user.name || 'Editor'
      );
    } catch (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
    }

    return NextResponse.json({
      message: 'Copy editor assigned successfully',
      manuscript: updatedManuscript,
      assignment: updatedManuscript.copyEditorAssignment,
    });

  } catch (error) {
    console.error('Error assigning copy editor:', error);
    return NextResponse.json({ 
      error: 'Failed to assign copy editor' 
    }, { status: 500 });
  }
}

// Get copy editor assignment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const manuscript = await Manuscript.findById(params.id)
      .populate('copyEditorAssignment.copyEditorId', 'name email')
      .populate('copyEditorAssignment.assignedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    return NextResponse.json({
      assignment: manuscript.copyEditorAssignment,
      copyEditingStage: manuscript.copyEditingStage,
      status: manuscript.status,
    });

  } catch (error) {
    console.error('Error fetching copy editor assignment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch assignment details' 
    }, { status: 500 });
  }
}
