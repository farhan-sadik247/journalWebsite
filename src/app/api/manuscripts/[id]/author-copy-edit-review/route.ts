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

    const { approval, comments, files } = await request.json();

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
        reviewedAt: new Date(),
        files: files || []
      },
      lastModified: new Date(),
    };

    // If files are provided, update the latest manuscript files for publication
    if (files && files.length > 0) {
      // Replace existing files with new ones as the latest version
      updateData.latestManuscriptFiles = files.map((file: any) => ({
        ...file,
        type: 'manuscript-final',
        version: `author-review-${new Date().toISOString()}`,
        isCurrentVersion: true,
        uploadedAt: new Date()
      }));
    }
    // Note: If no files are provided, we keep existing latestManuscriptFiles unchanged

    // Update copy editing stage based on approval
    if (approval === 'approved') {
      updateData.copyEditingStage = 'author-approved';
      updateData.status = 'ready-for-publication';
    } else if (approval === 'revision-requested') {
      updateData.copyEditingStage = 'revision-needed';
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
        comments: comments || '',
        filesUploaded: files ? files.length : 0
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
              ${files && files.length > 0 ? `<p style="margin: 5px 0; color: #374151;"><strong>Files Attached:</strong> ${files.length} file(s)</p>` : ''}
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

      // Email to editors when manuscript is ready for publication
      if (approval === 'approved') {
        // Find all editors to notify them
        const User = (await import('@/models/User')).default;
        const editors = await User.find({ role: 'editor' }).select('email name');
        
        for (const editor of editors) {
          if (editor.email) {
            await sendEmail({
              to: editor.email,
              subject: `📖 Manuscript Ready for Publication - ${updatedManuscript.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #22c55e;">📖 Manuscript Ready for Publication</h2>
                  <p>Dear ${editor.name || 'Editor'},</p>
                  
                  <p>A manuscript has been approved by the author and is now ready for publication.</p>
                  
                  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <h3 style="margin: 0 0 10px 0; color: #065f46;">Manuscript Details</h3>
                    <p><strong>📄 Title:</strong> ${updatedManuscript.title}</p>
                    <p><strong>👤 Authors:</strong> ${updatedManuscript.authors.map((a: any) => a.name).join(', ')}</p>
                    <p><strong>📅 Approval Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>📂 Category:</strong> ${updatedManuscript.category}</p>
                    ${files && files.length > 0 ? `<p><strong>📎 Updated Files:</strong> ${files.length} file(s) ready for publication</p>` : ''}
                  </div>
                  
                  <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0;">📋 Next Steps for Publication</h4>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Review the manuscript in the Publication Dashboard</li>
                      <li>Assign DOI and publication details</li>
                      <li>Schedule for publication in the appropriate issue</li>
                      <li>Download the latest author-approved files</li>
                    </ul>
                  </div>
                  
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard/publication" 
                       style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                       📋 Open Publication Dashboard
                    </a>
                  </p>
                  
                  <p>Best regards,<br>Editorial Management System</p>
                </div>
              `
            });
          }
        }
      }

      // Email to editorial team (admin notification) - they will handle editor coordination
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@journal.com';
      
      // Send to admin (who can then coordinate with the appropriate editor)
      const emailRecipients = [adminEmail];

      for (const email of emailRecipients) {
        await sendEmail({
          to: email,
          subject: `🔔 Author Copy-Edit Review Complete - ${updatedManuscript.title} ${approval === 'approved' ? '(READY FOR PUBLICATION)' : '(NEEDS REVISION)'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>🔔 Author Copy-Edit Review Complete</h2>
              <p><strong>Important:</strong> An author has completed their review of the copy-edited manuscript and action is required.</p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p><strong>📄 Manuscript:</strong> ${updatedManuscript.title}</p>
                <p><strong>👤 Author:</strong> ${updatedManuscript.submittedBy.name} (${updatedManuscript.submittedBy.email})</p>
                <p><strong>📅 Review Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>✅ Status:</strong> ${approval === 'approved' ? 'APPROVED - Ready for Publication' : 'REVISIONS REQUESTED'}</p>
                ${comments ? `<p><strong>💬 Author Comments:</strong><br>"${comments}"</p>` : ''}
                ${files && files.length > 0 ? `<p><strong>📎 Updated Files:</strong> ${files.length} file(s) uploaded by author (use these for publication!)</p>` : ''}
              </div>
              
              ${approval === 'approved' ? 
                `<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; color: #065f46; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0;">✅ MANUSCRIPT APPROVED - READY FOR PUBLICATION</h3>
                  <p style="margin: 5px 0;"><strong>Next Steps:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>The author has approved the copy-edited version</li>
                    <li>Use the latest uploaded files for publication (stored in latestManuscriptFiles)</li>
                    <li>Coordinate with the appropriate editor to begin publication process</li>
                    <li>Notify the author once publication is complete</li>
                  </ul>
                </div>` : 
                `<div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; color: #991b1b; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0;">⚠️ REVISIONS REQUESTED BY AUTHOR</h3>
                  <p style="margin: 5px 0;"><strong>Next Steps:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Review the author's comments above</li>
                    <li>Coordinate with the copy editor to address the feedback</li>
                    <li>Make necessary revisions to the manuscript</li>
                    <li>Resubmit the updated version to the author for re-review</li>
                  </ul>
                </div>`
              }
              
              <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0;">🎯 Administrative Actions Required:</h4>
                <p style="margin: 5px 0;">1. Assign or notify the appropriate handling editor</p>
                <p style="margin: 5px 0;">2. ${approval === 'approved' ? 'Begin publication workflow with updated files' : 'Coordinate revision process with copy editor'}</p>
                <p style="margin: 5px 0;">3. Update manuscript status in the system</p>
              </div>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${updatedManuscript._id}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                   📋 View Manuscript Details
                </a>
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; text-align: center;">
                This is an automated notification from the Editorial Management System.<br>
                Please take appropriate action based on the author's review decision.
              </p>
            </div>
          `
        });
      }

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
