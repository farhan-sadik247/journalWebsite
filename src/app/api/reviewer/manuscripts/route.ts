import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectDB from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a reviewer
    const userRole = session.user.currentActiveRole || session.user.role;
    const userRoles = session.user.roles || [userRole];
    
    if (!userRoles.includes('reviewer')) {
      return NextResponse.json({ error: 'Access denied. Reviewer role required.' }, { status: 403 });
    }

    await connectDB();

    // Get reviews assigned to this reviewer to find manuscript IDs
    const assignedReviews = await Review.find({
      reviewerId: session.user.id
    }).select('manuscriptId').lean();

    const assignedManuscriptIds = assignedReviews.map(review => review.manuscriptId);

    // Get manuscripts assigned to this reviewer only (no published manuscripts)
    const manuscripts = await Manuscript
      .find({
        _id: { $in: assignedManuscriptIds },
        status: { $ne: 'published' }
      })
      .select('title abstract authors category status submissionDate publishedDate volume issue pages lastModified')
      .lean();

    // Transform data for response
    const transformedManuscripts = manuscripts.map(manuscript => ({
      _id: manuscript._id,
      title: manuscript.title,
      abstract: manuscript.abstract,
      authors: manuscript.authors,
      category: manuscript.category,
      status: manuscript.status,
      submissionDate: manuscript.submissionDate,
      publishedDate: manuscript.publishedDate,
      volume: manuscript.volume,
      issue: manuscript.issue,
      pages: manuscript.pages,
      lastModified: manuscript.lastModified
    }));

    // Get review status for assigned manuscripts
    const manuscriptsWithReviewStatus = await Promise.all(
      manuscripts.map(async (manuscript) => {
        const review = await Review.findOne({
          manuscriptId: manuscript._id,
          reviewerId: session.user.id
        }).select('status dueDate assignedDate submittedDate recommendation').lean();

        // Type assertion for better TypeScript handling
        const reviewData = review as any;

        return {
          _id: manuscript._id,
          title: manuscript.title,
          abstract: manuscript.abstract,
          status: manuscript.status,
          category: manuscript.category,
          submissionDate: manuscript.submissionDate,
          publishedDate: manuscript.publishedDate,
          lastModified: manuscript.lastModified,
          authors: manuscript.authors,
          submittedBy: manuscript.submittedBy,
          volume: manuscript.volume,
          issue: manuscript.issue,
          pages: manuscript.pages,
          reviewAssignment: reviewData ? {
            reviewId: reviewData._id,
            status: reviewData.status,
            dueDate: reviewData.dueDate,
            assignedDate: reviewData.assignedDate,
            submittedDate: reviewData.submittedDate,
            recommendation: reviewData.recommendation,
            isAssigned: true
          } : {
            isAssigned: false // This is a published manuscript, not assigned for review
          }
        };
      })
    );

    return NextResponse.json({ 
      manuscripts: manuscriptsWithReviewStatus,
      total: manuscriptsWithReviewStatus.length
    });

  } catch (error) {
    console.error('Error fetching reviewer manuscripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
