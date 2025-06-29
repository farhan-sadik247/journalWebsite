import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import mongoose from 'mongoose';

// Helper function to determine manuscript status based on completed reviews
function determineManuscriptStatus(completedReviews: any[]): string {
  const recommendations = completedReviews.map(review => review.recommendation);
  
  // Count recommendations
  const acceptCount = recommendations.filter(r => r === 'accept').length;
  const rejectCount = recommendations.filter(r => r === 'reject').length;
  const majorRevisionCount = recommendations.filter(r => r === 'major-revision').length;
  const minorRevisionCount = recommendations.filter(r => r === 'minor-revision').length;
  
  // Decision logic based on reviewer recommendations
  if (acceptCount >= Math.ceil(completedReviews.length / 2)) {
    return 'accepted';
  } else if (rejectCount >= Math.ceil(completedReviews.length / 2)) {
    return 'rejected';
  } else if (majorRevisionCount > 0) {
    return 'major-revision-requested';
  } else if (minorRevisionCount > 0) {
    return 'minor-revision-requested';
  } else {
    return 'under-editorial-review';
  }
}

// POST /api/manuscripts/[id]/update-status - Manually update manuscript status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow editors, admins, and authors to update their manuscript status
    if (!session.user.roles?.includes('editor') && 
        !session.user.roles?.includes('admin') && 
        session.user.role !== 'author') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid manuscript ID' }, { status: 400 });
    }

    await dbConnect();

    // Get the manuscript
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if author is trying to update their own manuscript
    if (session.user.role === 'author' && 
        manuscript.submittedBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Can only update your own manuscripts' }, { status: 403 });
    }

    // Get completed reviews
    const completedReviews = await Review.find({ 
      manuscriptId: params.id, 
      status: 'completed' 
    });

    const originalStatus = manuscript.status;
    let newStatus = originalStatus;

    if (completedReviews.length >= 2) {
      newStatus = determineManuscriptStatus(completedReviews);
      
      if (newStatus !== originalStatus) {
        // Update the manuscript status
        manuscript.status = newStatus;
        
        // Add timeline entry
        manuscript.timeline.push({
          event: 'status-update',
          description: `Status updated from ${originalStatus} to ${newStatus} based on completed reviews`,
          performedBy: new mongoose.Types.ObjectId(session.user.id),
          metadata: {
            previousStatus: originalStatus,
            newStatus: newStatus,
            reviewCount: completedReviews.length,
            recommendations: completedReviews.map(r => r.recommendation),
            triggeredBy: session.user.email
          }
        });

        await manuscript.save();
      }
    }

    return NextResponse.json({
      message: newStatus !== originalStatus ? 'Status updated successfully' : 'Status already up to date',
      manuscriptId: params.id,
      previousStatus: originalStatus,
      currentStatus: newStatus,
      updated: newStatus !== originalStatus,
      completedReviews: completedReviews.length,
      recommendations: completedReviews.map(r => r.recommendation)
    });

  } catch (error) {
    console.error('Error updating manuscript status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
