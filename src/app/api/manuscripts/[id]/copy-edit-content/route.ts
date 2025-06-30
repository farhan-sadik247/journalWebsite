import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

// PUT /api/manuscripts/[id]/copy-edit-content - Update manuscript content during copy editing
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only copy editors and admins can edit content
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { title, abstract, copyEditingNotes } = await request.json();

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id);

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if this copy editor is assigned to this manuscript
    if (manuscript.assignedCopyEditor?.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
    }

    // Only allow editing if in copy-editing stage
    if (manuscript.copyEditingStage !== 'copy-editing') {
      return NextResponse.json({ error: 'Manuscript is not in copy-editing stage' }, { status: 400 });
    }

    const updateData: any = {
      lastModified: new Date(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (abstract !== undefined) {
      updateData.abstract = abstract;
    }

    if (copyEditingNotes !== undefined) {
      updateData.copyEditingNotes = copyEditingNotes;
    }

    // Add timeline entry for content update
    updateData.$push = {
      timeline: {
        event: 'copy-edit-content-updated',
        description: 'Manuscript content updated during copy editing',
        performedBy: session.user.id,
        metadata: {
          updatedFields: Object.keys(updateData).filter(key => key !== 'lastModified' && key !== '$push'),
          copyEditorName: session.user.name
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      message: 'Manuscript content updated successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error updating copy edit content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
