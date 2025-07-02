import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const issueId = params.id;

    // Find the volume that contains this issue
    const volume = await Volume.findOne({
      'issues._id': issueId
    }).populate('issues.manuscripts', 'title authors status');

    if (!volume) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Find the specific issue
    const issue = volume.issues.id(issueId);
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Return the issue with volume information
    const issueData = {
      ...issue.toObject(),
      volume: {
        _id: volume._id,
        number: volume.number,
        year: volume.year,
        title: volume.title
      }
    };

    return NextResponse.json({
      issue: issueData
    });

  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'editor')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const issueId = params.id;

    // Find the volume that contains this issue
    const volume = await Volume.findOne({
      'issues._id': issueId
    });

    if (!volume) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Find the specific issue
    const issue = volume.issues.id(issueId);
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Check if issue is published (optional protection)
    if (issue.isPublished) {
      return NextResponse.json(
        { error: 'Cannot delete published issue' },
        { status: 400 }
      );
    }

    // Remove the issue from the volume
    volume.issues.pull(issueId);
    await volume.save();

    return NextResponse.json({
      message: 'Issue deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
