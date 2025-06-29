import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Correction from '@/models/Correction';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const query: any = {};

    // Apply filters
    switch (filter) {
      case 'pending':
      case 'under-review':
      case 'approved':
      case 'rejected':
      case 'published':
        query.status = filter;
        break;
      case 'correction':
      case 'retraction':
      case 'expression-of-concern':
      case 'erratum':
        query.type = filter;
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }

    const corrections = await Correction.find(query)
      .populate('manuscriptId', 'title doi')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(corrections);

  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      manuscriptId,
      type,
      title,
      description,
      reason,
      sections = []
    } = body;

    // Validate required fields
    if (!manuscriptId || !type || !title || !description || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create correction
    const correction = new Correction({
      manuscriptId,
      type,
      title,
      description,
      reason,
      sections,
      submittedBy: session.user.id,
      timeline: [{
        event: 'submitted',
        description: `Correction submitted by ${session.user.name}`,
        performedBy: session.user.id,
      }]
    });

    await correction.save();

    // Populate the response
    await correction.populate([
      { path: 'manuscriptId', select: 'title doi' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    return NextResponse.json(correction, { status: 201 });

  } catch (error) {
    console.error('Error creating correction:', error);
    return NextResponse.json(
      { error: 'Failed to create correction' },
      { status: 500 }
    );
  }
}
