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

    // Check if user is copy-editor or admin
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { title, abstract, copyEditingNotes } = await request.json();

    if (!title || !abstract) {
      return NextResponse.json({ error: 'Title and abstract are required' }, { status: 400 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy authors.user');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
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
    ).populate('submittedBy authors.user');

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
      .populate('submittedBy', 'name email')
      .populate('authors.user', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
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
