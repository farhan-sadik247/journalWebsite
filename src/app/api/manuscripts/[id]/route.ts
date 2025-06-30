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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Build filter based on user role using multi-role logic
    const filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
    // Get user role information
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    
    // Check if user has any of these roles
    const isAuthor = userRole === 'author' || userRoles.includes('author');
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isReviewer = userRole === 'reviewer' || userRoles.includes('reviewer');
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    // Authors can only see their own manuscripts (unless they have other roles)
    if (userRole === 'author' && !isEditor && !isAdmin && !isCopyEditor && !isReviewer) {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
    }
    // Copy editors can see manuscripts assigned to them (unless they have editor/admin roles)
    else if (userRole === 'copy-editor' && !isEditor && !isAdmin) {
      filter.assignedCopyEditor = new mongoose.Types.ObjectId(session.user.id);
    }
    // Reviewers can only see manuscripts they are assigned to review (unless they have editor/admin roles)
    else if (userRole === 'reviewer' && !isEditor && !isAdmin) {
      // Check if this reviewer has been assigned to review this manuscript
      const hasReviewAssignment = await Review.findOne({
        manuscriptId: new mongoose.Types.ObjectId(params.id),
        reviewerId: new mongoose.Types.ObjectId(session.user.id)
      });
      
      if (!hasReviewAssignment) {
        return NextResponse.json(
          { error: 'You are not assigned to review this manuscript' },
          { status: 403 }
        );
      }
    }
    // Editors and admins can see all manuscripts

    // Use aggregation pipeline to get manuscript with dynamic status
    const manuscriptPipeline = [
      { $match: filter },
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

    const manuscripts = await Manuscript.aggregate(manuscriptPipeline);
    const manuscript = manuscripts[0];

    if (!manuscript) {
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
    
    console.log('Manuscript detail API - Before fallback:', {
      manuscriptId: params.id,
      aggregatedStatus: manuscript.status,
      completedReviewsCount: reviewsForManuscript.length
    });
    
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
        console.log(`Manuscript ${params.id} status corrected: ${manuscript.status} → ${calculatedStatus}`);
        manuscript.status = calculatedStatus;
        
        // Also update the database
        try {
          await Manuscript.findByIdAndUpdate(params.id, { status: calculatedStatus });
          console.log(`Database updated with status: ${calculatedStatus}`);
        } catch (updateError) {
          console.error('Failed to update manuscript status in database:', updateError);
        }
      }
    }

    console.log('Manuscript detail API - Final status:', {
      manuscriptId: params.id,
      finalStatus: manuscript.status,
      title: manuscript.title?.substring(0, 50) + '...',
      completedReviews: reviewsForManuscript.length,
      aggregationWorked: manuscripts.length > 0 ? 'yes' : 'no',
      fallbackTriggered: reviewsForManuscript.length >= 2 ? 'yes' : 'no'
    });

    // Transform authors to include firstName and lastName for frontend compatibility
    const manuscriptData = transformManuscriptForFrontend(manuscript);

    return NextResponse.json({
      manuscript: manuscriptData,
    });
  } catch (error) {
    console.error('Get manuscript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
