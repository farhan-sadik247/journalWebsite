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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has editor or admin role in either role or roles array
    const userRole = session.user.role;
    const userRoles = session.user.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
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

    // Check if issue has manuscripts assigned
    if (!issue.manuscripts || issue.manuscripts.length === 0) {
      return NextResponse.json(
        { error: 'Cannot publish issue without assigned manuscripts' },
        { status: 400 }
      );
    }

    // Verify that all assigned manuscripts are in "author-approved" status
    const assignedManuscripts = await Manuscript.find({
      _id: { $in: issue.manuscripts },
      copyEditingStage: 'author-approved'
    });

    if (assignedManuscripts.length !== issue.manuscripts.length) {
      const notApprovedCount = issue.manuscripts.length - assignedManuscripts.length;
      return NextResponse.json(
        { error: `Cannot publish issue. ${notApprovedCount} manuscript(s) are not in "author-approved" status.` },
        { status: 400 }
      );
    }

    // Begin transaction-like operation
    try {
      // 1. Update all manuscripts to "published" status
      await Manuscript.updateMany(
        { _id: { $in: issue.manuscripts } },
        { 
          status: 'published',
          copyEditingStage: 'ready-for-production',
          productionStage: 'completed',
          publishedDate: new Date()
        }
      );

      // 2. Mark the issue as published
      issue.isPublished = true;
      issue.publishedDate = new Date();

      // 3. Save the volume
      await volume.save();

      // 4. Get the updated manuscripts with full details for response
      const publishedManuscripts = await Manuscript.find({
        _id: { $in: issue.manuscripts }
      }, {
        title: 1,
        authors: 1,
        status: 1,
        publishedDate: 1
      });

      return NextResponse.json({
        success: true,
        message: assignedManuscripts.length === 1 
          ? `Issue ${issue.number} published successfully with 1 article`
          : `Issue ${issue.number} published successfully with ${assignedManuscripts.length} articles`,
        data: {
          issue: {
            _id: issue._id,
            number: issue.number,
            title: issue.title,
            isPublished: issue.isPublished,
            publishedDate: issue.publishedDate,
            volume: {
              number: volume.number,
              year: volume.year,
              title: volume.title
            }
          },
          publishedManuscripts: publishedManuscripts,
          articleCount: publishedManuscripts.length
        }
      });

    } catch (updateError) {
      console.error('Error during publishing process:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish issue and manuscripts' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error publishing issue:', error);
    return NextResponse.json(
      { error: 'Failed to publish issue' },
      { status: 500 }
    );
  }
}
