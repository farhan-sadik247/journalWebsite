import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import { transformManuscriptForFrontend } from '@/lib/manuscriptUtils';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validate manuscript ID
    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    // 3. Ensure database connection
    try {
      await dbConnect();
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 4. Get user role information
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    
    // 5. Check if user has any of these roles
    const isAuthor = userRole === 'author' || userRoles.includes('author');
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isReviewer = userRole === 'reviewer' || userRoles.includes('reviewer');
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    // 6. Build the aggregation pipeline
    const manuscriptPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(params.id)
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'manuscriptId',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          completedReviews: {
            $filter: {
              input: '$reviews',
              cond: { $eq: ['$$this.status', 'completed'] }
            }
          }
        }
      },
      {
        $addFields: {
          completedReviewsCount: { $size: '$completedReviews' },
          // Dynamically determine status based on completed reviews - updated for single reviews
          dynamicStatus: {
            $cond: {
              if: { $gte: ['$completedReviewsCount', 1] }, // Check for 1+ reviews instead of 2+
              then: {
                $cond: {
                  if: { $gte: ['$completedReviewsCount', 2] }, // 2+ reviews - use majority rule
                  then: {
                    $let: {
                      vars: {
                        recommendations: {
                          $map: {
                            input: '$completedReviews',
                            as: 'review',
                            in: '$$review.recommendation'
                          }
                        }
                      },
                      in: {
                        $let: {
                          vars: {
                            acceptCount: {
                              $size: {
                                $filter: {
                                  input: '$$recommendations',
                                  cond: { $eq: ['$$this', 'accept'] }
                                }
                              }
                            },
                            rejectCount: {
                              $size: {
                                $filter: {
                                  input: '$$recommendations',
                                  cond: { $eq: ['$$this', 'reject'] }
                                }
                              }
                            },
                            majorRevisionCount: {
                              $size: {
                                $filter: {
                                  input: '$$recommendations',
                                  cond: { $eq: ['$$this', 'major-revision'] }
                                }
                              }
                            },
                            minorRevisionCount: {
                              $size: {
                                $filter: {
                                  input: '$$recommendations',
                                  cond: { $eq: ['$$this', 'minor-revision'] }
                                }
                              }
                            },
                            totalReviews: { $size: '$$recommendations' }
                          },
                          in: {
                            $cond: {
                              if: { $gte: ['$$acceptCount', { $ceil: { $divide: ['$$totalReviews', 2] } }] },
                              then: 'accepted',
                              else: {
                                $cond: {
                                  if: { $gte: ['$$rejectCount', { $ceil: { $divide: ['$$totalReviews', 2] } }] },
                                  then: 'rejected',
                                  else: {
                                    $cond: {
                                      if: { $gt: ['$$majorRevisionCount', 0] },
                                      then: 'major-revision-requested',
                                      else: {
                                        $cond: {
                                          if: { $gt: ['$$minorRevisionCount', 0] },
                                          then: 'minor-revision-requested',
                                          else: 'under-editorial-review'
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  else: { // Single review logic
                    $let: {
                      vars: {
                        singleRecommendation: { $arrayElemAt: ['$completedReviews.recommendation', 0] }
                      },
                      in: {
                        $cond: {
                          if: { $eq: ['$$singleRecommendation', 'accept'] },
                          then: 'accepted',
                          else: {
                            $cond: {
                              if: { $eq: ['$$singleRecommendation', 'reject'] },
                              then: 'rejected',
                              else: {
                                $cond: {
                                  if: { $eq: ['$$singleRecommendation', 'major-revision'] },
                                  then: 'major-revision-requested',
                                  else: {
                                    $cond: {
                                      if: { $eq: ['$$singleRecommendation', 'minor-revision'] },
                                      then: 'minor-revision-requested',
                                      else: '$status' // Keep current status for unclear recommendations
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              else: '$status'
            }
          }
        }
      },
      {
        $addFields: {
          // Use dynamic status if we have completed reviews, otherwise keep original status
          finalStatus: {
            $cond: {
              if: { $gte: ['$completedReviewsCount', 1] }, // Updated threshold
              then: '$dynamicStatus',
              else: '$status'
            }
          }
        }
      },
      {
        $addFields: {
          status: '$finalStatus'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'submittedBy',
          foreignField: '_id',
          as: 'submittedBy'
        }
      },
      {
        $unwind: {
          path: '$submittedBy',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          reviews: 0,
          completedReviews: 0,
          dynamicStatus: 0,
          finalStatus: 0,
          completedReviewsCount: 0,
          'submittedBy.password': 0
        }
      }
    ];

    // 7. Execute the query with proper error handling
    let manuscript;
    try {
      const manuscripts = await Manuscript.aggregate(manuscriptPipeline);
      manuscript = manuscripts[0];
    } catch (error) {
      console.error('Manuscript query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch manuscript' },
        { status: 500 }
      );
    }

    // 8. Handle manuscript not found
    if (!manuscript) {
      // Debug check
      try {
        const manuscriptExists = await Manuscript.findById(params.id).select('_id submittedBy status').lean();
        if (manuscriptExists) {
          return NextResponse.json(
            { error: 'You do not have permission to access this manuscript' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Debug query error:', error);
      }
      
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Fallback: If aggregation didn't update the status correctly, do it manually
    const reviewsForManuscript = await Review.find({ 
      manuscriptId: params.id, 
      status: 'completed' 
    }).lean();
    
    if (reviewsForManuscript.length >= 2) {
      const recommendations = reviewsForManuscript.map(r => r.recommendation);
      const acceptCount = recommendations.filter(r => r === 'accept').length;
      const rejectCount = recommendations.filter(r => r === 'reject').length;
      const majorRevisionCount = recommendations.filter(r => r === 'major-revision').length;
      const minorRevisionCount = recommendations.filter(r => r === 'minor-revision').length;

      let calculatedStatus = manuscript.status;
      if (acceptCount >= Math.ceil(reviewsForManuscript.length / 2)) {
        calculatedStatus = 'accepted';
      } else if (rejectCount >= Math.ceil(reviewsForManuscript.length / 2)) {
        calculatedStatus = 'rejected';
      } else if (majorRevisionCount > 0) {
        calculatedStatus = 'major-revision-requested';
      } else if (minorRevisionCount > 0) {
        calculatedStatus = 'minor-revision-requested';
      } else {
        calculatedStatus = 'under-editorial-review';
      }

      // Override status if calculation differs
      if (calculatedStatus !== manuscript.status) {
        manuscript.status = calculatedStatus;
        
        // Also update the database
        try {
          await Manuscript.findByIdAndUpdate(params.id, { status: calculatedStatus });
        } catch (updateError) {
          console.error('Failed to update manuscript status in database:', updateError);
        }
      }
    }

    // 9. Transform and return the manuscript data
    const transformedManuscript = transformManuscriptForFrontend(manuscript);
    return NextResponse.json({ manuscript: transformedManuscript });

  } catch (error) {
    console.error('Unhandled error in manuscript fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can delete manuscripts
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can delete manuscripts.' },
        { status: 403 }
      );
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if manuscript exists
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Get manuscript title for logging/response
    const manuscriptTitle = manuscript.title;
    const manuscriptId = manuscript._id;

    // Delete associated reviews first
    await Review.deleteMany({ manuscriptId: params.id });

    // Delete the manuscript
    await Manuscript.findByIdAndDelete(params.id);

    // Log the deletion for audit purposes
    console.log(`ADMIN DELETION: Manuscript "${manuscriptTitle}" (ID: ${manuscriptId}) deleted by admin ${session.user.email} at ${new Date().toISOString()}`);

    return NextResponse.json({
      message: 'Manuscript and associated data deleted successfully',
      deletedManuscript: {
        id: manuscriptId,
        title: manuscriptTitle
      }
    });

  } catch (error) {
    console.error('Delete manuscript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
