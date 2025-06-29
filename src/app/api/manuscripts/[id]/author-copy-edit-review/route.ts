import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approval, comments } = await request.json();

    if (!approval) {
      return NextResponse.json({ error: 'Approval status is required' }, { status: 400 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy assignedCopyEditor');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is authorized (author or submitter)
    const isAuthor = manuscript.authors.some((author: any) => 
      author.email === session.user.email
    );
    const isSubmitter = manuscript.submittedBy._id.toString() === session.user.id;

    if (!isAuthor && !isSubmitter) {
      return NextResponse.json({ error: 'Not authorized to review this manuscript' }, { status: 403 });
    }

    // Update manuscript with author review
    const updateData: any = {
      authorCopyEditReview: {
        approval,
        comments: comments || '',
        reviewedBy: session.user.id,
        reviewDate: new Date()
      },
      lastModified: new Date(),
    };

    // Update copy editing stage based on approval
    if (approval === 'approved') {
      updateData.copyEditingStage = 'proofreading';
      updateData.status = 'in-copy-editing';
    } else if (approval === 'revision-requested') {
      updateData.copyEditingStage = 'copy-editing';
      updateData.status = 'in-copy-editing';
    }

    // Add timeline event
    const timelineEvent = {
      event: `Author Copy-Edit Review: ${approval}`,
      description: approval === 'approved' 
        ? 'Author approved copy-edited version' 
        : 'Author requested revisions to copy-edited version',
      date: new Date(),
      performedBy: session.user.id,
      metadata: {
        approval,
        comments: comments || ''
      }
    };

    updateData.$push = { timeline: timelineEvent };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy assignedCopyEditor');

    // Send notification emails
    try {
      // Email to copy editor
      if (updatedManuscript.assignedCopyEditor?.email) {
        const emailSubject = `Author Review Completed - ${updatedManuscript.title}`;
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Author Copy-Edit Review Completed</h2>
            <p>Dear Copy Editor,</p>
            
            <p>The author has reviewed the copy-edited version of the manuscript "<strong>${updatedManuscript.title}</strong>".</p>
            
            <div style="background: ${approval === 'approved' ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${approval === 'approved' ? '#10b981' : '#ef4444'};">
              <h3 style="margin: 0 0 10px 0; color: ${approval === 'approved' ? '#065f46' : '#991b1b'};">Review Result: ${approval === 'approved' ? 'Approved' : 'Revisions Requested'}</h3>
              ${comments ? `<p style="margin: 5px 0; color: #374151;"><strong>Author Comments:</strong><br>${comments}</p>` : ''}
            </div>
            
            <p>Please check your copy editor dashboard for the next steps.</p>
            
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor/manuscripts/${updatedManuscript._id}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               View Manuscript
            </a></p>
            
            <p>Best regards,<br>Editorial Team</p>
          </div>
        `;
        
        await sendEmail({
          to: updatedManuscript.assignedCopyEditor.email,
          subject: emailSubject,
          html: emailContent
        });
      }

      // Email to editorial team (admin notification)
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@journal.com';
      await sendEmail({
        to: adminEmail,
        subject: `Author Copy-Edit Review - ${updatedManuscript.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Author Copy-Edit Review Notification</h2>
            <p>An author has completed their review of the copy-edited manuscript.</p>
            <p><strong>Manuscript:</strong> ${updatedManuscript.title}</p>
            <p><strong>Result:</strong> ${approval}</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor/manuscripts/${updatedManuscript._id}">View Manuscript</a></p>
          </div>
        `
      });
    } catch (emailError) {
      console.log('Email notification failed (non-critical):', emailError);
    }

    return NextResponse.json({
      message: 'Author review submitted successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error submitting author review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
