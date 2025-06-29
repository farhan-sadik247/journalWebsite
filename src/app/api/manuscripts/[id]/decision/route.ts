import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// POST /api/manuscripts/[id]/decision - Submit editorial decision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is editor or admin
    if (!session.user.roles?.includes('editor') && !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid manuscript ID' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      decision, 
      editorComments, 
      confidentialNotes, 
      includeReviewerComments,
      customMessage 
    } = body;

    if (!decision || !editorComments) {
      return NextResponse.json({ error: 'Decision and editor comments are required' }, { status: 400 });
    }

    await dbConnect();

    // Find the manuscript
    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .lean();

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Get reviews if needed for author notification
    let reviews: any[] = [];
    if (includeReviewerComments) {
      reviews = await Review.find({ 
        manuscriptId: params.id, 
        status: 'completed' 
      }).select('recommendation ratings comments').lean();
    }

    // Update manuscript status based on decision
    let newStatus = (manuscript as any).status;
    switch (decision) {
      case 'accept':
        newStatus = 'accepted';
        break;
      case 'minor-revision':
      case 'major-revision':
        newStatus = 'revision-requested';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
    }

    // Update manuscript with decision
    await Manuscript.findByIdAndUpdate(params.id, {
      status: newStatus,
      $push: {
        timeline: {
          event: 'editorial-decision',
          description: `Editorial decision: ${decision}`,
          performedBy: new mongoose.Types.ObjectId(session.user.id),
          metadata: {
            decision,
            editorComments,
            confidentialNotes,
            includeReviewerComments
          }
        }
      }
    });

    // Send notification email to author
    try {
      const manuscriptData = manuscript as any;
      const authorEmail = manuscriptData.submittedBy?.email;
      const authorName = manuscriptData.submittedBy?.name;

      if (authorEmail && authorName) {
        const emailContent = generateDecisionEmail(
          authorName,
          manuscriptData.title,
          decision,
          editorComments,
          customMessage,
          reviews,
          manuscriptData._id.toString()
        );

        await sendEmail({
          to: authorEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send decision email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Editorial decision submitted successfully',
      decision: {
        manuscriptId: params.id,
        decision,
        status: newStatus,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error submitting editorial decision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDecisionEmail(
  authorName: string,
  manuscriptTitle: string,
  decision: string,
  editorComments: string,
  customMessage: string,
  reviews: any[],
  manuscriptId: string
) {
  const decisionMap = {
    'accept': 'Accepted',
    'minor-revision': 'Minor Revisions Required',
    'major-revision': 'Major Revisions Required',
    'reject': 'Rejected'
  };

  const decisionColor = {
    'accept': '#10b981',
    'minor-revision': '#f59e0b',
    'major-revision': '#ef4444',
    'reject': '#dc2626'
  };

  const subject = `Editorial Decision: ${decisionMap[decision as keyof typeof decisionMap]} - ${manuscriptTitle}`;

  let reviewsSection = '';
  if (reviews.length > 0) {
    reviewsSection = `
      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin-bottom: 15px;">Reviewer Comments:</h3>
        ${reviews.map((review, index) => `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #2563eb;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937;">Review ${index + 1}</h4>
            <p style="margin: 5px 0;"><strong>Recommendation:</strong> ${review.recommendation?.replace('-', ' ') || 'N/A'}</p>
            ${review.ratings ? `
              <p style="margin: 5px 0;"><strong>Overall Rating:</strong> ${review.ratings.overall || 'N/A'}/10</p>
            ` : ''}
            ${review.comments?.forAuthors ? `
              <div style="margin-top: 10px;">
                <strong>Comments:</strong>
                <p style="margin: 5px 0; line-height: 1.6;">${review.comments.forAuthors}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  const nextStepsSection = decision === 'accept' ? `
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 10px 0; color: #065f46;">Next Steps:</h3>
      <p style="margin: 5px 0; color: #065f46;">Your manuscript has been accepted for publication! Our production team will contact you soon regarding:</p>
      <ul style="margin: 10px 0; color: #065f46;">
        <li>Copy-editing process</li>
        <li>Proof review</li>
        <li>Publication timeline</li>
        <li>Copyright agreement</li>
      </ul>
    </div>
  ` : decision.includes('revision') ? `
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">Revision Instructions:</h3>
      <p style="margin: 5px 0; color: #92400e;">Please address the comments and resubmit your revised manuscript through our submission system.</p>
      <p style="margin: 5px 0; color: #92400e;"><strong>Revision Deadline:</strong> 60 days from this notification</p>
      <p style="margin: 5px 0; color: #92400e;">Please include a detailed response letter explaining how you addressed each comment.</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${decisionColor[decision as keyof typeof decisionColor]};">Editorial Decision</h2>
      <p>Dear ${authorName},</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #374151;">Manuscript: ${manuscriptTitle}</h3>
        <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
        <p style="margin: 5px 0;"><strong>Decision:</strong> <span style="color: ${decisionColor[decision as keyof typeof decisionColor]}; font-weight: 600;">${decisionMap[decision as keyof typeof decisionMap]}</span></p>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin-bottom: 10px;">Editor Comments:</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #2563eb; line-height: 1.6;">
          ${editorComments.replace(/\n/g, '<br>')}
        </div>
      </div>

      ${customMessage ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">Additional Message:</h3>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 3px solid #0ea5e9; line-height: 1.6;">
            ${customMessage.replace(/\n/g, '<br>')}
          </div>
        </div>
      ` : ''}

      ${reviewsSection}
      
      ${nextStepsSection}

      <p style="margin-top: 30px;">
        You can log into your account to view the full decision details and take any necessary actions.
      </p>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscriptId}" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Manuscript Details
        </a>
      </p>

      <p style="margin-top: 30px;">Best regards,<br>Editorial Team</p>
    </div>
  `;

  return { subject, html };
}
