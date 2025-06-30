import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { 
  notifyEditorCopyEditingComplete
} from '@/lib/notificationUtils';

// POST /api/manuscripts/[id]/copy-editor-confirm - Copy editor confirms completion after author approval
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only copy editors and admins can confirm completion
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { reportToEditor, finalNotes } = await request.json();

    if (!reportToEditor || reportToEditor.trim() === '') {
      return NextResponse.json({ error: 'Report to editor is required' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('copyEditorAssignment.assignedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if this copy editor is assigned to this manuscript
    if (manuscript.copyEditorAssignment?.copyEditorId?.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
    }

    // Check if manuscript has been approved by author
    if (manuscript.copyEditorAssignment?.status !== 'approved-by-author') {
      return NextResponse.json({ 
        error: 'Manuscript must be approved by author before copy editor can confirm completion' 
      }, { status: 400 });
    }

    // Update manuscript with copy editor confirmation
    const updateData = {
      lastModified: new Date(),
      'copyEditorAssignment.copyEditorConfirmation.confirmed': true,
      'copyEditorAssignment.copyEditorConfirmation.confirmedAt': new Date(),
      'copyEditorAssignment.copyEditorConfirmation.reportToEditor': reportToEditor,
      'copyEditorAssignment.copyEditorConfirmation.finalNotes': finalNotes || '',
      'copyEditorAssignment.status': 'confirmed-by-copy-editor',
      status: 'ready-for-publication',
      $push: {
        timeline: {
          event: 'copy-editor-confirmed-completion',
          description: 'Copy editor confirmed completion and sent report to editor',
          performedBy: session.user.id,
          metadata: {
            copyEditorName: session.user.name,
            reportToEditor: reportToEditor,
            finalNotes: finalNotes || ''
          }
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy', 'name email')
     .populate('copyEditorAssignment.assignedBy', 'name email');

    // Notify the assigning editor that the copy editing process is complete
    if (updatedManuscript.copyEditorAssignment?.assignedBy) {
      await notifyEditorCopyEditingComplete(
        updatedManuscript.copyEditorAssignment.assignedBy.email,
        params.id,
        updatedManuscript.title,
        session.user.name || 'Copy Editor',
        updatedManuscript.submittedBy.name || 'Author',
        reportToEditor,
        finalNotes
      );
    }

    // Also notify any other editors/admins
    const editors = await User.find({ 
      role: { $in: ['editor', 'admin'] },
      _id: { $ne: updatedManuscript.copyEditorAssignment?.assignedBy?._id }
    });

    for (const editor of editors) {
      await notifyEditorCopyEditingComplete(
        editor.email,
        params.id,
        updatedManuscript.title,
        session.user.name || 'Copy Editor',
        updatedManuscript.submittedBy.name || 'Author',
        reportToEditor,
        finalNotes
      );
    }

    return NextResponse.json({
      message: 'Copy editing confirmation sent successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error confirming copy editor completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
