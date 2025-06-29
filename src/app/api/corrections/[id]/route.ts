import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Correction from '@/models/Correction';

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

    const correction = await Correction.findById(params.id)
      .populate('manuscriptId', 'title doi authors')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('timeline.performedBy', 'name email')
      .lean();

    if (!correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
    }

    return NextResponse.json(correction);

  } catch (error) {
    console.error('Error fetching correction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch correction' },
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

    // Check if user has correction management permissions
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { status, reviewNotes } = body;

    const correction = await Correction.findById(params.id);
    if (!correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
    }

    // Update correction status
    correction.status = status;
    correction.reviewedBy = session.user.id;
    
    if (reviewNotes) {
      correction.reviewNotes = reviewNotes;
    }

    // Add timeline event
    correction.timeline.push({
      event: `status-changed-${status}`,
      description: `Status changed to ${status} by ${session.user.name}`,
      performedBy: session.user.id,
    });

    await correction.save();

    // Populate the response
    await correction.populate([
      { path: 'manuscriptId', select: 'title doi' },
      { path: 'submittedBy', select: 'name email' },
      { path: 'reviewedBy', select: 'name email' }
    ]);

    return NextResponse.json(correction);

  } catch (error) {
    console.error('Error updating correction:', error);
    return NextResponse.json(
      { error: 'Failed to update correction' },
      { status: 500 }
    );
  }
}
