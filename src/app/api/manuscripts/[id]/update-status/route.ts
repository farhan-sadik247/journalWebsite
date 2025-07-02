import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import Payment from '@/models/Payment';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';
import { notifyManuscriptAccepted, createNotification } from '@/lib/notificationUtils';
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

    // Protection: Prevent status changes for published manuscripts
    if (manuscript.status === 'published') {
      return NextResponse.json({ 
        error: 'Cannot update status of published manuscripts to prevent data corruption',
        manuscriptId: params.id,
        currentStatus: manuscript.status,
        message: 'Published manuscripts are protected from status changes'
      }, { status: 400 });
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

    // Enhanced logic to handle both single and multiple reviews
    if (completedReviews.length >= 1) {
      if (completedReviews.length >= 2) {
        // Use majority rule for 2+ reviews
        newStatus = determineManuscriptStatus(completedReviews);
      } else if (completedReviews.length === 1) {
        // Handle single review cases - be more responsive
        const singleRecommendation = completedReviews[0].recommendation;
        if (singleRecommendation === 'accept') {
          newStatus = 'accepted';
        } else if (singleRecommendation === 'reject') {
          newStatus = 'rejected';
        } else if (singleRecommendation === 'major-revision') {
          newStatus = 'major-revision-requested';
        } else if (singleRecommendation === 'minor-revision') {
          newStatus = 'minor-revision-requested';
        }
        // For unclear recommendations with single review, keep current status
      }
      
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

        // Handle notifications based on status change
        await handleStatusChangeNotifications(manuscript, originalStatus, newStatus, session.user);
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

// Helper function to handle notifications for status changes
async function handleStatusChangeNotifications(manuscript: any, oldStatus: string, newStatus: string, currentUser: any) {
  try {
    const author = await User.findById(manuscript.submittedBy);
    if (!author) return;

    const manuscriptTitle = manuscript.title;
    const manuscriptId = manuscript._id.toString();

    switch (newStatus) {
      case 'accepted':
        // Get fee configuration to determine payment amount
        const feeConfig = await FeeConfig.findOne({ isActive: true });
        const apcAmount = feeConfig ? feeConfig.amount : 200; // Default amount
        
        // Create payment record
        const payment = new Payment({
          manuscriptId: manuscript._id,
          userId: author._id,
          amount: apcAmount,
          currency: 'USD',
          status: 'pending',
          paymentMethod: 'pending',
          description: `APC payment for manuscript: ${manuscriptTitle}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          createdBy: currentUser.id
        });
        
        await payment.save();

        // Update manuscript with payment info
        await Manuscript.findByIdAndUpdate(manuscript._id, {
          requiresPayment: true,
          paymentStatus: 'pending',
          apcAmount: apcAmount,
          paymentDeadline: payment.dueDate,
          paymentId: payment._id
        });

        // Notify author about acceptance and payment requirement
        await notifyManuscriptAccepted(
          author.email,
          manuscriptId,
          manuscriptTitle,
          apcAmount,
          payment._id.toString()
        );
        break;

      case 'rejected':
        await createNotification({
          recipientEmail: author.email,
          type: 'manuscript_status',
          title: 'Manuscript Decision: Rejected',
          message: `Unfortunately, your manuscript "${manuscriptTitle}" has not been accepted for publication. Please review the feedback provided by the reviewers.`,
          manuscriptId,
          priority: 'medium',
          actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
          createdBy: currentUser.email
        });
        break;

      case 'major-revision-requested':
        await createNotification({
          recipientEmail: author.email,
          type: 'manuscript_status',
          title: 'Manuscript Decision: Major Revision Required',
          message: `Your manuscript "${manuscriptTitle}" requires major revisions before it can be accepted. Please review the reviewer comments and resubmit.`,
          manuscriptId,
          priority: 'high',
          actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
          createdBy: currentUser.email
        });
        break;

      case 'minor-revision-requested':
        await createNotification({
          recipientEmail: author.email,
          type: 'manuscript_status',
          title: 'Manuscript Decision: Minor Revision Required',
          message: `Your manuscript "${manuscriptTitle}" requires minor revisions. Please address the reviewer comments and resubmit.`,
          manuscriptId,
          priority: 'medium',
          actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
          createdBy: currentUser.email
        });
        break;
    }
  } catch (error) {
    console.error('Error sending status change notifications:', error);
    // Don't throw error to avoid breaking the main workflow
  }
}
