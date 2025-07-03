import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Review from '@/models/Review';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendEmail } from '@/lib/email';
import { notifyManuscriptAcceptedWithFee, notifyAuthorReviewSubmitted } from '@/lib/notificationUtils';

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

    const { id } = params;
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const {
      comments,
      confidentialComments,
      recommendation,
      technicalQuality,
      novelty,
      significance,
      clarity,
      overallScore,
    } = await request.json();

    // Connect to database
    await dbConnect();

    // Find review and populate related document references
    const review = await Review.findById(id)
      .populate('manuscriptId')
      .populate('reviewerId')
      .populate('assignedBy');
    
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check permissions (only reviewer can submit their own review)
    if (review.reviewerId._id.toString() !== session.user.id && 
        !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: "Not authorized to submit this review" }, 
        { status: 403 }
      );
    }

    // Update review data
    review.comments = comments;
    review.confidentialComments = confidentialComments;
    review.recommendation = recommendation;
    review.ratings = {
      technicalQuality: technicalQuality || 5,
      novelty: novelty || 5,
      significance: significance || 5,
      clarity: clarity || 5,
      overall: overallScore || 5
    };
    review.status = 'completed';
    // completedDate will be set by the pre-save hook

    try {
      await review.save();
    } catch (saveError) {
      console.error('Error saving review:', saveError);
      return NextResponse.json({ error: 'Error saving review' }, { status: 500 });
    }

    // Notify the author that a review has been submitted - errors here shouldn't stop the process
    try {
      const manuscriptData = review.manuscriptId as any;
      const reviewer = await User.findById(review.reviewerId);
      
      // Notify all authors of the manuscript
      if (manuscriptData.authors && Array.isArray(manuscriptData.authors)) {
        for (const author of manuscriptData.authors) {
          if (author.email) {
            try {
              // Send in-app notification
              await notifyAuthorReviewSubmitted(
                author.email,
                manuscriptData._id.toString(),
                manuscriptData.title,
                reviewer?.name
              );
            } catch (notifyError) {
              console.error('Error sending in-app notification:', notifyError);
              // Continue despite notification error
            }

            try {
              // Send email notification
              const reviewerText = reviewer?.name ? ` by ${reviewer.name}` : '';
              const emailResult = await sendEmail({
                to: author.email,
                subject: `Review Submitted for Your Manuscript: ${manuscriptData.title}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Review Submitted</h2>
                    <p>Dear ${author.name || 'Author'},</p>
                    <p>We wanted to inform you that a review has been submitted${reviewerText} for your manuscript:</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                      <strong>"${manuscriptData.title}"</strong>
                    </div>
                    <p>The editorial team will now review the feedback and make a decision on the next steps for your manuscript. You will receive another notification once the editorial decision has been made.</p>
                    <p>You can view the status of your manuscript in your dashboard:</p>
                    <p style="text-align: center; margin: 25px 0;">
                      <a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscriptData._id}" 
                         style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View Manuscript Status
                      </a>
                    </p>
                    <p>Thank you for your submission to our journal.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                    <p style="font-size: 12px; color: #6c757d;">
                      This is an automated message from the journal submission system. Please do not reply to this email.
                    </p>
                  </div>
                `,
                text: `A review has been submitted${reviewerText} for your manuscript "${manuscriptData.title}". The editorial team will review the feedback and update you on the next steps. You can view your manuscript status at: ${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscriptData._id}`
              });
              
              if (!emailResult.success) {
                console.warn('Email failed to send but continuing with review submission:', emailResult.error);
              }
            } catch (emailError) {
              console.error('Error sending email notification:', emailError);
              // Continue despite email error
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error in author notification process:', notificationError);
      // Continue with the request even if notification fails
    }

    // Check if all reviews are completed for this manuscript
    let manuscript;
    try {
      manuscript = await Manuscript.findById(review.manuscriptId._id);
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
          performedBy: session.user.id, // Use the reviewer's ID instead of null
          metadata: {
            previousStatus: previousStatus,
            newStatus: newStatus,
            reviewCount: completedReviews.length,
            recommendations: completedReviews.map(r => r.recommendation),
            triggeredBy: 'review-completion',
            reviewerId: session.user.id
          }
        });
        
        try {
          console.log('Saving manuscript with updated timeline:', {
            manuscriptId: manuscript._id,
            newStatus,
            timelineEntryCount: manuscript.timeline.length
          });
          await manuscript.save();
          console.log('Manuscript saved successfully');
        } catch (saveError) {
          console.error('Error saving manuscript with timeline update:', saveError);
          // Continue despite save error - we've already saved the review
        }
        
        // If accepted, trigger additional workflow steps
        if (newStatus === 'accepted') {
          try {
            await handleAcceptedManuscript(manuscript, session.user.id);
          } catch (acceptError) {
            console.error('Error in accepted manuscript workflow:', acceptError);
            // Continue despite error
          }
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
    } catch (manuscriptError) {
      console.error('Error processing manuscript status updates:', manuscriptError);
      // Continue despite manuscript processing error - the review is already saved
    }

    // Send notification to editor (but don't fail if email fails)
    if (review.assignedBy && review.assignedBy.email) {
      try {
        const emailResult = await sendEmail({
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
        
        if (!emailResult.success) {
          console.warn('Email to editor failed to send but continuing with review submission:', emailResult.error);
        }
      } catch (emailError) {
        console.log('Email notification to editor failed (non-critical):', (emailError as Error).message);
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
async function handleAcceptedManuscript(manuscript: any, performedByUserId?: string) {
  try {
    // Get corresponding author info first
    const correspondingAuthor = manuscript.authors.find((author: any) => author.isCorresponding);
    if (!correspondingAuthor) {
      console.error('No corresponding author found for accepted manuscript');
      return; // Exit gracefully instead of throwing an error
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
      performedBy: performedByUserId || new mongoose.Types.ObjectId(), // Use provided user ID or create a system ID
      metadata: {
        acceptedDate: new Date(),
        nextStep: 'payment-required',
        triggeredBy: performedByUserId ? 'review-completion' : 'system'
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
      // Continue without throwing error - notification failure shouldn't block the process
    }
  } catch (error) {
    console.error('Error in handleAcceptedManuscript function:', error);
    // Don't rethrow the error, just log it and continue
  }
}
