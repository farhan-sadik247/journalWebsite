import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendEmail } from '@/lib/email';
import { notifyManuscriptAcceptedWithFee } from '@/lib/notificationUtils';

// GET /api/reviews/[id] - Get specific review details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const review = await Review.findById(params.id)
      .populate('manuscriptId', 'title abstract authors keywords submissionDate files')
      .populate('reviewerId', 'name email')
      .populate('assignedBy', 'name email');

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check permissions
    const canAccess = 
      (review.reviewerId as any)._id.toString() === session.user.id ||
      session.user.roles?.includes('editor') || session.user.roles?.includes('admin') ||
      (session.user.roles?.includes('author') && (review.manuscriptId as any).authors.some((author: any) => 
        author.email === session.user.email
      ));

    if (!canAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({ review: review.toObject() });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/reviews/[id] - Submit/update review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const review = await Review.findById(params.id)
      .populate('manuscriptId', 'title authors')
      .populate('assignedBy', 'email name');

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the assigned reviewer
    if (review.reviewerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      recommendation,
      confidentialComments,
      publicComments,
      technicalQuality,
      novelty,
      significance,
      clarity,
      overallScore,
      detailedComments
    } = body;

    // Update review using the correct model structure
    review.recommendation = recommendation;
    review.comments = {
      confidentialToEditor: confidentialComments || '',
      forAuthors: publicComments || '',
      detailedReview: detailedComments || ''
    };
    review.ratings = {
      technicalQuality: technicalQuality || 5,
      novelty: novelty || 5,
      significance: significance || 5,
      clarity: clarity || 5,
      overall: overallScore || 5
    };
    review.status = 'completed';
    // completedDate will be set by the pre-save hook

    await review.save();

    // Check if all reviews are completed for this manuscript
    const manuscript = await Manuscript.findById(review.manuscriptId._id);
    const allReviews = await Review.find({ manuscriptId: review.manuscriptId._id });
    const completedReviews = allReviews.filter(r => r.status === 'completed');

    // Auto-update manuscript status based on reviews - more flexible thresholds
    let shouldUpdateStatus = false;
    let newStatus = manuscript.status;
    
    if (completedReviews.length >= 1) { // At least 1 review completed
      // If we have 2+ reviews, use majority rule
      if (completedReviews.length >= 2) {
        newStatus = determineManuscriptStatus(completedReviews);
        shouldUpdateStatus = true;
      } 
      // If we have only 1 review but it's a strong recommendation (accept/reject), consider updating
      else if (completedReviews.length === 1) {
        const singleRecommendation = completedReviews[0].recommendation;
        if (singleRecommendation === 'accept') {
          newStatus = 'accepted';
          shouldUpdateStatus = true;
        } else if (singleRecommendation === 'reject') {
          newStatus = 'rejected';
          shouldUpdateStatus = true;
        } else if (singleRecommendation === 'major-revision') {
          newStatus = 'major-revision-requested';
          shouldUpdateStatus = true;
        } else if (singleRecommendation === 'minor-revision') {
          newStatus = 'minor-revision-requested';
          shouldUpdateStatus = true;
        }
        // For mixed or unclear recommendations with single review, keep current status
      }
    }
    
    if (shouldUpdateStatus && newStatus !== manuscript.status) {
      const previousStatus = manuscript.status;
      manuscript.status = newStatus;
      
      // Add timeline entry for status change
      manuscript.timeline.push({
        event: 'status-change',
        description: `Status changed to ${newStatus} based on review recommendations`,
        performedBy: null, // System-generated
        metadata: {
          previousStatus: previousStatus,
          newStatus: newStatus,
          reviewCount: completedReviews.length,
          recommendations: completedReviews.map(r => r.recommendation),
          triggeredBy: 'review-completion'
        }
      });
      
      await manuscript.save();
      
      // If accepted, trigger additional workflow steps
      if (newStatus === 'accepted') {
        await handleAcceptedManuscript(manuscript);
      }
    }

    // IMPORTANT: Also trigger notifications if this specific review is "accept" 
    // regardless of overall manuscript status change
    if (recommendation === 'accept') {
      try {
        await handleAcceptedManuscript(manuscript);
      } catch (notificationError) {
        console.error('Error sending accept review notifications:', notificationError);
        // Continue with the request even if notification fails
      }
    }

    // Send notification to editor (but don't fail if email fails)
    if (review.assignedBy && review.assignedBy.email) {
      try {
        await sendEmail({
          to: review.assignedBy.email,
          subject: `Review Completed - ${review.manuscriptId.title}`,
          html: `
            <h2>Review Completed</h2>
            <p>Dear ${review.assignedBy.name},</p>
            <p>A review has been completed for the manuscript: <strong>${review.manuscriptId.title}</strong></p>
            <p><strong>Recommendation:</strong> ${recommendation}</p>
            <p>Please log in to your editorial dashboard to view the full review and make editorial decisions.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/editor">View Editorial Dashboard</a></p>
            <p>Best regards,<br>Journal System</p>
          `
        });
      } catch (emailError) {
        console.log('Email notification failed (non-critical):', (emailError as Error).message);
        // Continue with the request even if email fails
      }
    }

    return NextResponse.json({ 
      message: 'Review submitted successfully',
      review: review.toObject()
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    // Majority accept
    return 'accepted';
  } else if (rejectCount >= Math.ceil(completedReviews.length / 2)) {
    // Majority reject
    return 'rejected';
  } else if (majorRevisionCount > 0) {
    // Any major revision request takes precedence
    return 'major-revision-requested';
  } else if (minorRevisionCount > 0) {
    // Minor revision if no major revisions
    return 'minor-revision-requested';
  } else {
    // Mixed recommendations - requires editorial decision
    return 'under-editorial-review';
  }
}

// Helper function to handle accepted manuscripts and trigger publishing workflow
async function handleAcceptedManuscript(manuscript: any) {
  try {
    // Get corresponding author info first
    const correspondingAuthor = manuscript.authors.find((author: any) => author.isCorresponding);
    if (!correspondingAuthor) {
      throw new Error('No corresponding author found for accepted manuscript');
    }

    // Check if acceptance notifications have already been sent for this manuscript
    const existingAcceptanceNotifications = await Notification.find({
      relatedManuscript: manuscript._id,
      type: { $in: ['manuscript_status', 'payment_required'] },
      title: { $regex: /accepted|payment/i }
    }).sort({ createdAt: -1 }).limit(5);

    // Check if recent notifications were already sent (within last 24 hours)
    const recentNotifications = existingAcceptanceNotifications.filter(notif => {
      const timeDiff = Date.now() - new Date(notif.createdAt).getTime();
      return timeDiff < 24 * 60 * 60 * 1000; // 24 hours
    });

    if (recentNotifications.length >= 2) {
      console.log('Acceptance notifications already sent recently, skipping duplicate notifications');
      return;
    }

    // Add accepted manuscript to publishing queue
    manuscript.timeline.push({
      event: 'accepted',
      description: 'Manuscript accepted and moved to publication queue',
      performedBy: null, // System-generated
      metadata: {
        acceptedDate: new Date(),
        nextStep: 'payment-required'
      }
    });
    
    // Update status to show next step in publishing pipeline
    manuscript.status = 'accepted';
    
    await manuscript.save();

    // Prepare manuscript data for fee calculation
    const manuscriptData = {
      articleType: manuscript.category || 'research',
      authorCountry: correspondingAuthor.country || 'US',
      institutionName: correspondingAuthor.affiliation
    };

    // Send notifications with fee calculation
    try {
      const notificationResult = await notifyManuscriptAcceptedWithFee(
        correspondingAuthor.email,
        manuscript._id.toString(),
        manuscript.title,
        manuscriptData
      );
      
      console.log('Acceptance notifications sent successfully:', {
        acceptance: notificationResult.acceptanceNotification?._id,
        payment: notificationResult.paymentNotification?._id,
        feeWaived: notificationResult.feeCalculation?.isWaiver || false
      });
    } catch (notificationError) {
      console.error('Error sending acceptance notifications:', notificationError);
      // Continue with fallback email notification
    }
    
    // Send fallback email notification to author about acceptance
    try {
      await sendEmail({
        to: correspondingAuthor.email,
        subject: `Manuscript Accepted - ${manuscript.title}`,
        html: `
          <h2>Congratulations! Your Manuscript Has Been Accepted</h2>
          <p>We are pleased to inform you that your manuscript "<strong>${manuscript.title}</strong>" has been accepted for publication.</p>
          <p>Please check your dashboard for payment information and next steps in the publication process.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscript._id}">View Manuscript Status</a></p>
          <p>Congratulations and thank you for your contribution!</p>
          <p>Best regards,<br>Editorial Team</p>
        `
      });
    } catch (emailError) {
      console.log('Acceptance email notification failed (non-critical):', (emailError as Error).message);
    }
    
  } catch (error) {
    console.error('Error handling accepted manuscript:', error);
    // Don't throw error to prevent breaking the main flow
  }
}
