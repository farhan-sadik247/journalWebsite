import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { Types } from 'mongoose';

// GET /api/reviews - Get reviews (for reviewer/editor dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const manuscriptId = searchParams.get('manuscriptId');

    let query: any = {};

    // Filter based on user role and permissions
    if (session.user.roles?.includes('reviewer')) {
      query.reviewerId = session.user.id;
      // Also filter by manuscript if specified for reviewers
      if (manuscriptId) {
        query.manuscriptId = manuscriptId;
      }
    } else if (session.user.roles?.includes('editor') || session.user.roles?.includes('admin')) {
      // Editors and admins can see all reviews, but filter by manuscript when specified
      if (manuscriptId) {
        query.manuscriptId = manuscriptId;
      }
    } else if (session.user.roles?.includes('author') && manuscriptId) {
      // Authors can only see reviews for their own manuscripts
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript || !manuscript.authors.some((author: any) => author.email === session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      query.manuscriptId = manuscriptId;
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (status) {
      query.status = status;
    }

    const reviews = await Review.find(query)
      .populate('manuscriptId', 'title authors status submissionDate category abstract')
      .populate('reviewerId', 'name email')
      .sort({ assignedDate: -1 })
      .lean();

    // Filter sensitive information for authors
    const filteredReviews = reviews.map(review => {
      if (session.user.roles?.includes('author') && manuscriptId) {
        // Authors should only see public information
        return {
          ...review,
          reviewerId: undefined, // Hide reviewer identity for double-blind
          comments: review.comments ? {
            forAuthors: review.comments.forAuthors,
            // Hide confidential comments from authors
            confidentialToEditor: undefined,
            detailedReview: review.comments.detailedReview
          } : undefined
        };
      }
      return review;
    });

    return NextResponse.json({ reviews: filteredReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reviews - Create new review assignment (editor only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user.roles?.includes('editor') || session.user.roles?.includes('admin'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { manuscriptId, reviewerId, type, dueDate } = body;

    // Validate inputs
    if (!manuscriptId || !reviewerId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if manuscript exists
    const manuscript = await Manuscript.findById(manuscriptId);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if reviewer exists and has reviewer role
    const reviewer = await User.findById(reviewerId);
    if (!reviewer) {
      return NextResponse.json({ error: 'Reviewer not found' }, { status: 400 });
    }
    
    // Check if user has reviewer role (either in roles array or old role field)
    const hasReviewerRole = reviewer.roles?.includes('reviewer') || reviewer.role === 'reviewer';
    if (!hasReviewerRole) {
      return NextResponse.json({ error: 'User is not a reviewer' }, { status: 400 });
    }

    // Check if review already assigned
    const existingReview = await Review.findOne({
      manuscriptId: manuscriptId,
      reviewerId: reviewerId
    });

    if (existingReview) {
      return NextResponse.json({ error: 'Review already assigned to this reviewer' }, { status: 400 });
    }

    // Create review
    const review = new Review({
      manuscriptId: manuscriptId,
      reviewerId: reviewerId,
      assignedBy: session.user.id,
      type,
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      status: 'pending'
    });

    await review.save();

    // Update manuscript status
    if (manuscript.status === 'submitted') {
      manuscript.status = 'under-review';
      await manuscript.save();
    }

    // Send email notification to reviewer
    try {
      await sendEmail({
        to: reviewer.email,
        subject: 'New Review Assignment - Research Journal',
        html: `
          <h2>New Review Assignment</h2>
          <p>Dear ${reviewer.name},</p>
          <p>You have been assigned to review the manuscript: <strong>${manuscript.title}</strong></p>
          <p><strong>Review Type:</strong> ${review.type}</p>
          <p><strong>Due Date:</strong> ${review.dueDate.toLocaleDateString()}</p>
          <p>Please log in to your dashboard to access the manuscript and begin your review:</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard/reviews/${review._id}">Review Manuscript</a></p>
          <p>Best regards,<br>Editorial Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the API call if email fails
    }

    return NextResponse.json({ 
      message: 'Review assigned successfully',
      review: review.toObject()
    });
  } catch (error) {
    console.error('Error creating review assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
