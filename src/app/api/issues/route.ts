import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get all volumes with their issues and populate manuscripts
    const volumes = await Volume.find({})
      .populate('issues.manuscripts', 'title authors status')
      .sort({ year: -1, number: -1 });

    // Flatten issues from all volumes
    const issues = volumes.flatMap(volume => 
      volume.issues.map((issue: any) => ({
        ...issue.toObject(),
        volume: {
          _id: volume._id,
          number: volume.number,
          year: volume.year,
          title: volume.title
        }
      }))
    );

    return NextResponse.json({
      issues,
      total: issues.length
    });

  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { volumeId, number, title, description, editorialNote, coverImage, status, publishDate } = body;

    // Validate required fields
    if (!volumeId || !number || !title) {
      return NextResponse.json(
        { error: 'Volume ID, number, and title are required' },
        { status: 400 }
      );
    }

    // Find the volume
    const volume = await Volume.findById(volumeId);
    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    // Check issue limit (3-4 issues per volume)
    if (volume.issues.length >= 4) {
      return NextResponse.json(
        { error: 'Maximum of 4 issues per volume allowed' },
        { status: 400 }
      );
    }

    // Check if issue number already exists for this volume
    const existingIssue = volume.issues.find((issue: any) => issue.number === parseInt(number));
    if (existingIssue) {
      return NextResponse.json(
        { error: `Issue ${number} already exists for this volume` },
        { status: 400 }
      );
    }

    // Prepare issue data
    const issueData: any = {
      number: parseInt(number),
      title,
      description: description || '',
      editorialNote: editorialNote || '',
      isPublished: status === 'published',
    };

    // Handle cover image
    if (coverImage) {
      try {
        issueData.coverImage = JSON.parse(coverImage);
      } catch (e) {
        issueData.coverImage = { url: '', publicId: '', originalName: '' };
      }
    }

    // Handle publish date
    if (publishDate) {
      issueData.publishedDate = new Date(publishDate);
    }

    // Add the issue to the volume
    volume.issues.push(issueData);
    volume.lastModifiedBy = session.user.id;
    
    await volume.save();

    // Get the newly created issue
    const newIssue = volume.issues[volume.issues.length - 1];

    return NextResponse.json({
      message: 'Issue created successfully',
      issue: {
        ...newIssue.toObject(),
        volume: {
          _id: volume._id,
          number: volume.number,
          year: volume.year,
          title: volume.title
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
