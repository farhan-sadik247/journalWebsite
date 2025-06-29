import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');

    await connectToDatabase();

    // Verify manuscript exists and is published
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    if (manuscript.status !== 'published') {
      return NextResponse.json({ error: 'Comments only available for published manuscripts' }, { status: 400 });
    }

    // Build filter
    const filter: any = {
      manuscriptId: params.id,
      isApproved: true,
      parentId: null // Only get top-level comments initially
    };

    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    // Get comments with user information and replies count
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'comments',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$parentId', '$$commentId'] },
                    { $eq: ['$isApproved', true] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            {
              $unwind: '$user'
            },
            {
              $project: {
                'user.password': 0,
                'user.role': 0
              }
            },
            { $sort: { createdAt: 1 } }
          ],
          as: 'replies'
        }
      },
      {
        $addFields: {
          repliesCount: { $size: '$replies' }
        }
      },
      {
        $project: {
          'user.password': 0,
          'user.role': 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [comments, total] = await Promise.all([
      Comment.aggregate(pipeline),
      Comment.countDocuments(filter)
    ]);

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, type, parentId } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify manuscript exists and is published
    const manuscript = await Manuscript.findById(params.id).populate('submittedBy authors.user');
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    if (manuscript.status !== 'published') {
      return NextResponse.json({ error: 'Comments only allowed on published manuscripts' }, { status: 400 });
    }

    // Check if replying to existing comment
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.manuscriptId.toString() !== params.id) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 });
      }
    }

    // Get user information
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is an author of this manuscript
    const isAuthor = manuscript.authors.some((author: any) => 
      author.email === user.email || (author.user && author.user._id.toString() === user._id.toString())
    );

    const isEditor = user.role === 'editor' || user.role === 'admin';

    // Create comment
    const comment = new Comment({
      manuscriptId: params.id,
      userId: session.user.id,
      parentId: parentId || null,
      content: content.trim(),
      type: type || 'comment',
      isAuthorComment: isAuthor,
      isEditorComment: isEditor,
      // Auto-approve comments from authors and editors
      isApproved: isAuthor || isEditor,
    });

    await comment.save();

    // Populate user information
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name email profileImage')
      .populate('parentId');

    // Send notification emails
    if (comment.isApproved) {
      try {
        // Notify manuscript authors (unless they posted the comment)
        if (!isAuthor) {
          const authorEmails = manuscript.authors.map((author: any) => author.email);
          const emailSubject = `New comment on your published article - ${manuscript.title}`;
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>New Comment on Your Published Article</h2>
              <p>A new comment has been posted on your article "<strong>${manuscript.title}</strong>".</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Comment by:</strong> ${user.name}</p>
                <p><strong>Comment:</strong> ${content}</p>
              </div>
              
              <p><a href="${process.env.NEXTAUTH_URL}/articles/${manuscript._id}#comments" 
                 style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                 View Comment
              </a></p>
              
              <p>Best regards,<br>Research Journal Team</p>
            </div>
          `;

          for (const email of authorEmails) {
            await sendEmail({
              to: email,
              subject: emailSubject,
              html: emailContent,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send comment notification:', emailError);
      }
    }

    return NextResponse.json({
      message: comment.isApproved ? 'Comment posted successfully' : 'Comment submitted for moderation',
      comment: populatedComment
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
