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
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { manuscriptIds } = await request.json();
    const issueId = params.id;

    if (!Array.isArray(manuscriptIds)) {
      return NextResponse.json(
        { error: 'Invalid manuscript IDs provided' },
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

    // Update the issue's manuscripts array
    issue.manuscripts = manuscriptIds;

    // Update each manuscript's volume and issue assignment
    await Promise.all([
      // First, clear any previous assignments for manuscripts being removed
      Manuscript.updateMany(
        { 
          volume: volume.number,
          issue: issue.number,
          _id: { $nin: manuscriptIds }
        },
        { 
          $unset: { volume: '', issue: '' }
        }
      ),
      // Then assign the new manuscripts
      Manuscript.updateMany(
        { _id: { $in: manuscriptIds } },
        { 
          volume: volume.number,
          issue: issue.number
        }
      )
    ]);

    // Save the volume
    await volume.save();

    return NextResponse.json({
      success: true,
      message: 'Manuscripts assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning manuscripts:', error);
    return NextResponse.json(
      { error: 'Failed to assign manuscripts' },
      { status: 500 }
    );
  }
}
