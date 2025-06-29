import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { sendEmail, emailTemplates } from '@/lib/email';
import { transformAuthorForDatabase } from '@/lib/manuscriptUtils';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Extract form fields
    const title = formData.get('title') as string;
    const abstract = formData.get('abstract') as string;
    const keywords = JSON.parse(formData.get('keywords') as string);
    const authorsFromForm = JSON.parse(formData.get('authors') as string);
    const correspondingAuthor = formData.get('correspondingAuthor') as string;

    // Map authors from { firstName, lastName } format to { name } format for database compatibility
    const authors = authorsFromForm.map(transformAuthorForDatabase);
    const category = formData.get('category') as string;
    const funding = formData.get('funding') as string || '';
    const conflictOfInterest = formData.get('conflictOfInterest') as string || '';
    const ethicsStatement = formData.get('ethicsStatement') as string || '';
    const dataAvailability = formData.get('dataAvailability') as string || '';
    const reviewerSuggestions = JSON.parse(formData.get('reviewerSuggestions') as string || '[]');

    // Validate required fields
    if (!title || !abstract || !keywords.length || !authors.length || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle file uploads
    const files = formData.getAll('files') as File[];
    const uploadedFiles = [];

    console.log('Processing files for upload:', files.length, 'files');

    for (const file of files) {
      if (file.size > 0) {
        console.log('Uploading file:', file.name, 'size:', file.size);
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const uploadResult = await uploadToCloudinary(buffer, file.name, 'manuscripts');
          
          console.log('Upload successful:', uploadResult.public_id, 'URL:', uploadResult.secure_url);
          
          uploadedFiles.push({
            filename: uploadResult.public_id,
            originalName: file.name,
            cloudinaryId: uploadResult.public_id,
            url: uploadResult.secure_url,
            type: 'manuscript',
            size: uploadResult.bytes,
            version: 1,
          });
        } catch (uploadError) {
          console.error('File upload failed for:', file.name, uploadError);
          return NextResponse.json(
            { error: `Failed to upload file: ${file.name}` },
            { status: 500 }
          );
        }
      }
    }

    console.log('Total uploaded files:', uploadedFiles.length);

    await dbConnect();

    // Create manuscript
    const manuscript = await Manuscript.create({
      title,
      abstract,
      keywords,
      authors,
      correspondingAuthor,
      submittedBy: new mongoose.Types.ObjectId(session.user.id),
      files: uploadedFiles,
      category,
      funding,
      conflictOfInterest,
      ethicsStatement,
      dataAvailability,
      reviewerSuggestions,
      timeline: [{
        event: 'submitted',
        description: 'Manuscript submitted for review',
        performedBy: new mongoose.Types.ObjectId(session.user.id),
      }],
    });

    // Send confirmation email
    try {
      const emailContent = emailTemplates.manuscriptSubmitted(
        session.user.name,
        title,
        manuscript._id.toString()
      );
      
      await sendEmail({
        to: session.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json(
      {
        message: 'Manuscript submitted successfully',
        manuscript: {
          id: manuscript._id,
          title: manuscript.title,
          status: manuscript.status,
          submissionDate: manuscript.submissionDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Manuscript submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('GET manuscripts - User session:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const editor = searchParams.get('editor'); // For editor dashboard
    const copyEditing = searchParams.get('copyEditing'); // For copy-editor dashboard

    await dbConnect();

    // Build filter based on user role
    const filter: Record<string, any> = {};
    
    if (session.user.role === 'author' && !editor && !copyEditing) {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
      console.log('Author filter applied - submittedBy:', session.user.id, 'as ObjectId:', filter.submittedBy);
    } else if (session.user.role === 'reviewer' && !editor && !copyEditing) {
      // Reviewers see manuscripts assigned to them
      // This would need to be implemented based on Review model
      console.log('Reviewer filter applied');
    } else if (session.user.role === 'copy-editor' && copyEditing) {
      // Copy-editors see accepted manuscripts in production
      filter.status = { $in: ['accepted', 'in-production'] };
      console.log('Copy-editor filter applied - showing accepted/in-production manuscripts');
    } else if ((session.user.role === 'editor' || session.user.role === 'admin') || editor) {
      // Editors and admins see all manuscripts
      console.log('Editor/Admin filter applied - showing all manuscripts');
    }

    // Add additional filters
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (query) {
      filter.$text = { $search: query };
    }

    const skip = (page - 1) * limit;

    // Aggregate pipeline to include review counts and dynamic status for editor dashboard
    const pipeline: any[] = [
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
          reviewsCount: { $size: '$reviews' },
          completedReviews: {
            $size: {
              $filter: {
                input: '$reviews',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          completedReviewsArray: {
            $filter: {
              input: '$reviews',
              cond: { $eq: ['$$this.status', 'completed'] }
            }
          }
        }
      },
      {
        $addFields: {
          // Dynamically determine status based on completed reviews
          dynamicStatus: {
            $cond: {
              if: { $gte: ['$completedReviews', 2] },
              then: {
                $let: {
                  vars: {
                    recommendations: {
                      $map: {
                        input: '$completedReviewsArray',
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
              else: '$status'
            }
          }
        }
      },
      {
        $addFields: {
          // Use dynamic status if we have enough completed reviews, otherwise keep original status
          finalStatus: {
            $cond: {
              if: { $gte: ['$completedReviews', 2] },
              then: '$dynamicStatus',
              else: '$status'
            }
          }
        }
      },
      {
        $addFields: {
          status: '$finalStatus',
          // Transform authors to include firstName and lastName for frontend compatibility
          authors: {
            $map: {
              input: '$authors',
              as: 'author',
              in: {
                firstName: {
                  $first: {
                    $split: ['$$author.name', ' ']
                  }
                },
                lastName: {
                  $let: {
                    vars: {
                      nameParts: { $split: ['$$author.name', ' '] }
                    },
                    in: {
                      $cond: {
                        if: { $gt: [{ $size: '$$nameParts' }, 1] },
                        then: {
                          $reduce: {
                            input: { $slice: ['$$nameParts', 1, { $subtract: [{ $size: '$$nameParts' }, 1] }] },
                            initialValue: '',
                            in: {
                              $concat: [
                                '$$value',
                                { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                                '$$this'
                              ]
                            }
                          }
                        },
                        else: ''
                      }
                    }
                  }
                },
                email: '$$author.email',
                affiliation: '$$author.affiliation',
                orcid: '$$author.orcid',
                isCorresponding: '$$author.isCorresponding'
              }
            }
          }
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
          completedReviewsArray: 0,
          dynamicStatus: 0,
          finalStatus: 0,
          'submittedBy.password': 0,
          'submittedBy.role': 0
        }
      },
      { $sort: { submissionDate: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [manuscripts, total] = await Promise.all([
      Manuscript.aggregate(pipeline),
      Manuscript.countDocuments(filter),
    ]);

    console.log('Manuscripts query result:', {
      filter,
      manuscriptsCount: manuscripts.length,
      total,
      manuscripts: manuscripts.map(m => ({
        id: m._id,
        title: m.title,
        submittedBy: m.submittedBy,
        status: m.status
      }))
    });

    return NextResponse.json({
      manuscripts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get manuscripts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
