import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { sendEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is copy-editor or admin using multi-role logic
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    if (!isCopyEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const requestBody = await request.json();
    const { title, abstract, copyEditingNotes } = requestBody;

    if (!title || !abstract) {
      return NextResponse.json({ error: 'Title and abstract are required' }, { status: 400 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if copy editor is assigned to this manuscript (unless admin)
    if (isCopyEditor && !isAdmin) {
      if (!manuscript.assignedCopyEditor || manuscript.assignedCopyEditor.toString() !== session.user.id) {
        return NextResponse.json({ error: 'You are not assigned to edit this manuscript' }, { status: 403 });
      }
    }

    // Update manuscript with copy-edited content
    const updateData: any = {
      title,
      abstract,
      copyEditingNotes: copyEditingNotes || '',
      lastModified: new Date(),
    };

    // Add timeline event
    const timelineEvent = {
      event: 'Copy Editing Updates',
      description: 'Manuscript content has been copy-edited',
      date: new Date(),
      performedBy: session.user.id
    };

    updateData.$push = { timeline: timelineEvent };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy');

    return NextResponse.json({
      message: 'Copy editing saved successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error saving copy editing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if copy editor is assigned to this manuscript (unless admin)
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    if (isCopyEditor && !isAdmin) {
      if (!manuscript.assignedCopyEditor || manuscript.assignedCopyEditor.toString() !== session.user.id) {
        return NextResponse.json({ error: 'You are not assigned to view this manuscript' }, { status: 403 });
      }
    }

    // Return copy editing specific information
    const copyEditInfo = {
      _id: manuscript._id,
      title: manuscript.title,
      abstract: manuscript.abstract,
      authors: manuscript.authors,
      files: manuscript.files,
      copyEditingStage: manuscript.copyEditingStage,
      copyEditingNotes: manuscript.copyEditingNotes,
      timeline: manuscript.timeline
    };

    return NextResponse.json({
      copyEditInfo
    });

  } catch (error) {
    console.error('Error fetching copy edit info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
