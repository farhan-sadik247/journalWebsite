import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has analytics permissions
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '12m';

    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '12m':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Arbitrary start date
        break;
    }

    // Submissions Analytics
    const submissionsByMonth = await Manuscript.aggregate([
      {
        $match: {
          submissionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submissionDate' },
            month: { $month: '$submissionDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    const submissionsByCategory = await Manuscript.aggregate([
      {
        $match: {
          submissionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const submissionsByStatus = await Manuscript.aggregate([
      {
        $match: {
          submissionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Review Analytics
    const reviewTurnaroundTime = await Review.aggregate([
      {
        $match: {
          submittedAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          avgDays: {
            $avg: {
              $divide: [
                { $subtract: ['$submittedAt', '$assignedAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          avgDays: { $round: ['$avgDays', 1] },
          _id: 0
        }
      }
    ]);

    // Publication Analytics
    const publicationsByMonth = await Manuscript.aggregate([
      {
        $match: {
          status: 'published',
          publishedDate: { $gte: startDate, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$publishedDate' },
            month: { $month: '$publishedDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    const topCitedArticles = await Manuscript.find({
      status: 'published',
      'metrics.citations': { $gt: 0 }
    })
      .select('title metrics.citations')
      .sort({ 'metrics.citations': -1 })
      .limit(10);

    // Engagement Analytics
    const viewsByMonth = await Manuscript.aggregate([
      {
        $match: {
          status: 'published',
          publishedDate: { $gte: startDate, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$publishedDate' },
            month: { $month: '$publishedDate' }
          },
          count: { $sum: '$metrics.views' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // Performance Metrics
    const totalSubmissions = await Manuscript.countDocuments({
      submissionDate: { $gte: startDate }
    });

    const totalPublished = await Manuscript.countDocuments({
      status: 'published',
      publishedDate: { $gte: startDate }
    });

    const acceptanceRate = totalSubmissions > 0 ? (totalPublished / totalSubmissions) * 100 : 0;

    const avgReviewTime = await Review.aggregate([
      {
        $match: {
          submittedAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          avgDays: {
            $avg: {
              $divide: [
                { $subtract: ['$submittedAt', '$assignedAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    const activeReviewers = await User.countDocuments({
      role: 'reviewer',
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const analyticsData = {
      submissions: {
        monthly: submissionsByMonth,
        byCategory: submissionsByCategory,
        byStatus: submissionsByStatus
      },
      reviews: {
        turnaroundTime: reviewTurnaroundTime,
        acceptanceRate: [] // Could add monthly acceptance rates if needed
      },
      publications: {
        monthly: publicationsByMonth,
        topCited: topCitedArticles.map(article => ({
          id: article._id.toString(),
          title: article.title,
          citations: article.metrics.citations
        }))
      },
      engagement: {
        views: viewsByMonth,
        downloads: viewsByMonth // Using same data for simplicity
      },
      performance: {
        averageReviewTime: avgReviewTime[0]?.avgDays ? Math.round(avgReviewTime[0].avgDays) : 0,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        totalSubmissions,
        totalPublished,
        activeReviewers
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
