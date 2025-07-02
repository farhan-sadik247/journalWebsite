import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';

export async function POST(
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

    const { manuscriptId } = await request.json();
    const issueId = params.id;

    if (!manuscriptId) {
      return NextResponse.json(
        { error: 'Manuscript ID is required' },
        { status: 400 }
      );
    }

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

    // Check if the manuscript is in this issue
    const manuscriptIndex = issue.manuscripts.indexOf(manuscriptId);
    if (manuscriptIndex === -1) {
      return NextResponse.json(
        { error: 'Manuscript not found in this issue' },
        { status: 404 }
      );
    }

    // Remove the manuscript from the issue
    issue.manuscripts.splice(manuscriptIndex, 1);

    // Update the manuscript to remove volume and issue assignments
    await Manuscript.findByIdAndUpdate(manuscriptId, {
      $unset: {
        volume: "",
        issue: ""
      }
    });

    // Save the volume
    await volume.save();

    return NextResponse.json({
      message: 'Manuscript removed from issue successfully'
    });

  } catch (error) {
    console.error('Error removing manuscript from issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
