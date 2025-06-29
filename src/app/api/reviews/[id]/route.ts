import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

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

    // Auto-update manuscript status based on reviews when sufficient reviews are completed
    if (completedReviews.length >= 2) { // Assuming minimum 2 reviews needed
      const newStatus = determineManuscriptStatus(completedReviews);
      manuscript.status = newStatus;
      
      // Add timeline entry for status change
      manuscript.timeline.push({
        event: 'status-change',
        description: `Status changed to ${newStatus} based on review recommendations`,
        performedBy: null, // System-generated
        metadata: {
          previousStatus: manuscript.status,
          newStatus: newStatus,
          reviewCount: completedReviews.length,
          recommendations: completedReviews.map(r => r.recommendation)
        }
      });
      
      await manuscript.save();
      
      // If accepted, trigger additional workflow steps
      if (newStatus === 'accepted') {
        await handleAcceptedManuscript(manuscript);
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
    // Add accepted manuscript to publishing queue
    manuscript.timeline.push({
      event: 'accepted',
      description: 'Manuscript accepted and moved to publication queue',
      performedBy: null, // System-generated
      metadata: {
        acceptedDate: new Date(),
        nextStep: 'copy-editing'
      }
    });
    
    // Update status to show next step in publishing pipeline
    manuscript.status = 'accepted-awaiting-copy-edit';
    
    await manuscript.save();
    
    // Send notification to author about acceptance
    try {
      const authorEmail = manuscript.authors.find((author: any) => author.isCorresponding)?.email;
      if (authorEmail) {
        await sendEmail({
          to: authorEmail,
          subject: `Manuscript Accepted - ${manuscript.title}`,
          html: `
            <h2>Congratulations! Your Manuscript Has Been Accepted</h2>
            <p>We are pleased to inform you that your manuscript "<strong>${manuscript.title}</strong>" has been accepted for publication.</p>
            <p>Your manuscript will now proceed through the copy-editing and production process.</p>
            <p>You will receive updates on the publication progress through your dashboard.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscript._id}">View Manuscript Status</a></p>
            <p>Congratulations and thank you for your contribution!</p>
            <p>Best regards,<br>Editorial Team</p>
          `
        });
      }
    } catch (emailError) {
      console.log('Acceptance email notification failed (non-critical):', (emailError as Error).message);
    }
    
  } catch (error) {
    console.error('Error handling accepted manuscript:', error);
    // Don't throw error to prevent breaking the main flow
  }
}
