import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

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

    // Check if user has permission to assign manuscripts to issues
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('editor');
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or editor role required.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { manuscriptIds, replaceAll = false } = await request.json();
    const issueId = params.id;

    console.log('Assignment Request:', {
      issueId,
      manuscriptIds,
      manuscriptCount: manuscriptIds?.length,
      replaceAll,
      operation: replaceAll ? 'REPLACE_ALL' : 'ADD_TO_EXISTING'
    });

    if (!Array.isArray(manuscriptIds)) {
      console.error('Invalid manuscriptIds:', manuscriptIds);
      return NextResponse.json(
        { error: 'Invalid manuscript IDs provided' },
        { status: 400 }
      );
    }

    // Validate that all manuscript IDs are valid ObjectIds
    for (const id of manuscriptIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('Invalid ObjectId:', id);
        return NextResponse.json(
          { error: `Invalid manuscript ID format: ${id}` },
          { status: 400 }
        );
      }
    }

    // Validate that the issue ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      console.error('Invalid issue ObjectId:', issueId);
      return NextResponse.json(
        { error: 'Invalid issue ID format' },
        { status: 400 }
      );
    }

    // Find the volume that contains this issue
    console.log('Looking for volume with issue ID:', issueId);
    const volume = await Volume.findOne({
      'issues._id': issueId
    });

    console.log('Found volume:', volume ? {
      _id: volume._id,
      number: volume.number,
      year: volume.year,
      issuesCount: volume.issues?.length
    } : 'null');

    if (!volume) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Find the specific issue
    const issue = volume.issues.id(issueId);
    console.log('Found issue:', issue ? {
      _id: issue._id,
      number: issue.number,
      title: issue.title,
      currentManuscripts: issue.manuscripts
    } : 'null');
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Verify that all manuscripts exist before proceeding
    console.log('Verifying manuscripts exist...');
    const manuscriptObjectIds = manuscriptIds.map(id => new mongoose.Types.ObjectId(id));
    const existingManuscripts = await Manuscript.find({
      _id: { $in: manuscriptObjectIds }
    }).select('_id title');

    console.log('Found manuscripts:', {
      requested: manuscriptIds.length,
      found: existingManuscripts.length,
      foundIds: existingManuscripts.map(m => m._id.toString())
    });

    if (existingManuscripts.length !== manuscriptIds.length) {
      const foundIds = existingManuscripts.map(m => m._id.toString());
      const missingIds = manuscriptIds.filter(id => !foundIds.includes(id));
      console.error('Missing manuscripts:', missingIds);
      return NextResponse.json(
        { error: `Manuscripts not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Update the issue's manuscripts array
    if (replaceAll) {
      // Complete replacement - used by assignment page
      issue.manuscripts = manuscriptObjectIds;
    } else {
      // Add to existing - used by individual assignment from publication page
      const existingIds = issue.manuscripts || [];
      const newIds = manuscriptObjectIds.filter(id => 
        !existingIds.some((existingId: any) => existingId.toString() === id.toString())
      );
      issue.manuscripts = [...existingIds, ...newIds];
    }

    console.log('About to update manuscripts with:', {
      volumeNumber: volume.number,
      issueNumber: issue.number,
      manuscriptIds: issue.manuscripts.map((id: any) => id.toString()),
      operation: replaceAll ? 'REPLACE_ALL' : 'ADD_TO_EXISTING',
      newManuscripts: manuscriptObjectIds.map(id => id.toString())
    });

    // Update each manuscript's volume and issue assignment
    try {
      if (replaceAll) {
        // Complete replacement mode - clear removed ones and assign new ones
        const currentlyAssignedManuscripts = await Manuscript.find({
          volume: volume.number,
          issue: issue.number
        }).select('_id');
        
        const currentlyAssignedIds = currentlyAssignedManuscripts.map(m => m._id.toString());
        console.log('Currently assigned manuscripts:', currentlyAssignedIds);
        
        // The new list should replace the current list completely
        const manuscriptsToUnassign = currentlyAssignedIds.filter(id => 
          !manuscriptIds.includes(id)
        );
        
        const updateResults = await Promise.all([
          // Clear manuscripts that are being removed from this issue
          manuscriptsToUnassign.length > 0 ? Manuscript.updateMany(
            { 
              _id: { $in: manuscriptsToUnassign.map(id => new mongoose.Types.ObjectId(id)) }
            },
            { 
              $unset: { volume: '', issue: '' }
            }
          ) : Promise.resolve({ modifiedCount: 0 }),
          // Assign all manuscripts in the new list to this issue
          Manuscript.updateMany(
            { _id: { $in: manuscriptObjectIds } },
            { 
              volume: volume.number,
              issue: issue.number
            }
          )
        ]);

        console.log('Replace mode - Manuscript update results:', {
          unassignedCount: updateResults[0].modifiedCount,
          assignedCount: updateResults[1].modifiedCount,
          matchedForAssignment: updateResults[1].matchedCount,
          manuscriptsToUnassign: manuscriptsToUnassign,
          finalAssignedIds: manuscriptIds
        });
      } else {
        // Add mode - only assign new manuscripts, don't touch existing ones
        const updateResult = await Manuscript.updateMany(
          { _id: { $in: manuscriptObjectIds } },
          { 
            volume: volume.number,
            issue: issue.number
          }
        );

        console.log('Add mode - Manuscript update results:', {
          assignedCount: updateResult.modifiedCount,
          matchedForAssignment: updateResult.matchedCount,
          addedManuscripts: manuscriptObjectIds.map(id => id.toString())
        });
      }

    } catch (updateError) {
      console.error('Error updating manuscripts:', updateError);
      throw updateError;
    }

    // Save the volume
    console.log('Saving volume...');
    const saveResult = await volume.save();
    console.log('Volume saved successfully:', saveResult._id);

    return NextResponse.json({
      success: true,
      message: 'Manuscripts assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning manuscripts - Full error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error name:', errorName);
    console.error('Error message:', errorMessage);
    console.error('Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: 'Failed to assign manuscripts',
        details: errorMessage,
        type: errorName
      },
      { status: 500 }
    );
  }
}
