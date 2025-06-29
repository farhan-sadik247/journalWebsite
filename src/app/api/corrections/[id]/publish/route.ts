import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Correction from '@/models/Correction';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has publishing permissions
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const correction = await Correction.findById(params.id);
    if (!correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
    }

    if (correction.status !== 'approved') {
      return NextResponse.json(
        { error: 'Correction must be approved before publishing' },
        { status: 400 }
      );
    }

    // Generate DOI for the correction
    const currentYear = new Date().getFullYear();
    const correctionCount = await Correction.countDocuments({
      status: 'published',
      publishedDate: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1)
      }
    });
    
    const doi = `10.1000/correction.${currentYear}.${String(correctionCount + 1).padStart(4, '0')}`;

    // Update correction
    correction.status = 'published';
    correction.publishedDate = new Date();
    correction.doi = doi;
    correction.isPublic = true;

    // Add timeline event
    correction.timeline.push({
      event: 'published',
      description: `Correction published by ${session.user.name}`,
      performedBy: session.user.id,
    });

    await correction.save();

    // Here you would typically:
    // 1. Send notifications to relevant parties
    // 2. Update CrossRef with the correction
    // 3. Update the original manuscript's status
    // 4. Send email notifications to authors and subscribers

    // Populate the response
    await correction.populate([
      { path: 'manuscriptId', select: 'title doi' },
      { path: 'submittedBy', select: 'name email' },
      { path: 'reviewedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      message: 'Correction published successfully',
      correction: correction,
      doi: doi
    });

  } catch (error) {
    console.error('Error publishing correction:', error);
    return NextResponse.json(
      { error: 'Failed to publish correction' },
      { status: 500 }
    );
  }
}
