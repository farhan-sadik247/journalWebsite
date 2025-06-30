import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectDB from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { createNotification, notifyCopyEditorAuthorApproval } from '@/lib/notificationUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Author approval API called for manuscript:', params.id);
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { approved, comments } = await request.json();
    console.log('Request data:', { approved, comments, userEmail: session.user.email });

    // Fetch manuscript with populated fields
    const manuscript = await Manuscript.findById(params.id)
      .populate('copyEditorAssignment.copyEditorId', 'name email')
      .populate('copyEditorAssignment.assignedBy', 'name email');

    if (!manuscript) {
      console.log('Manuscript not found:', params.id);
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    console.log('Manuscript found:', {
      id: manuscript._id,
      title: manuscript.title,
      copyEditingStage: manuscript.copyEditingStage,
      authors: manuscript.authors.map((a: any) => a.email)
    });

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is the author of this manuscript
    const isAuthor = manuscript.authors.some((author: any) => author.email === session.user?.email);
    console.log('Author check:', { isAuthor, userEmail: session.user?.email });
    
    if (!isAuthor) {
      console.log('Access denied: User is not an author');
      return NextResponse.json({ error: 'Access denied. Only manuscript authors can approve.' }, { status: 403 });
    }

    // Check if manuscript is in the right stage for author review (now includes galley-submitted)
    console.log('Stage check:', { 
      currentStage: manuscript.copyEditingStage, 
      assignmentStatus: manuscript.copyEditorAssignment?.status,
      hasGalleyProofs: (manuscript.copyEditorAssignment?.galleyProofs?.length || 0) > 0
    });
    
    // Allow multiple valid stages for author review, including galley submission
    const validStagesForAuthorReview = ['author-review', 'copy-editing-complete', 'awaiting-author-review'];
    const validAssignmentStatuses = ['galley-submitted', 'completed'];
    
    const isValidStage = validStagesForAuthorReview.includes(manuscript.copyEditingStage) || 
                        validAssignmentStatuses.includes(manuscript.copyEditorAssignment?.status || '');
    
    if (!isValidStage) {
      console.log('Invalid stage for author review');
      return NextResponse.json({ 
        error: `Manuscript is not ready for author review. Current stage: ${manuscript.copyEditingStage}, Assignment status: ${manuscript.copyEditorAssignment?.status}` 
      }, { status: 400 });
    }

    // Check if copy editor assignment exists
    console.log('Copy editor assignment check:', {
      hasAssignment: !!manuscript.copyEditorAssignment,
      copyEditorId: manuscript.copyEditorAssignment?.copyEditorId,
      assignmentStatus: manuscript.copyEditorAssignment?.status
    });

    if (!manuscript.copyEditorAssignment || !manuscript.copyEditorAssignment.copyEditorId) {
      console.log('No copy editor assignment found');
      return NextResponse.json({ 
        error: 'No copy editor assignment found for this manuscript' 
      }, { status: 400 });
    }

    // Update manuscript with author approval
    const updateData: any = {
      // Update the author approval in the copy editor assignment
      'copyEditorAssignment.authorApproval.approved': approved === true,
      'copyEditorAssignment.authorApproval.approvedAt': new Date(),
      'copyEditorAssignment.authorApproval.comments': comments || (approved ? 'Approved by author' : 'Changes requested by author'),
      
      // Also keep legacy field for backward compatibility
      authorCopyEditReview: {
        approved: approved === true,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        comments: comments || (approved ? 'Approved by author' : 'Changes requested by author'),
      },
      lastModified: new Date(),
    };

    if (approved) {
      // If approved, update assignment status - copy editor needs to confirm next
      updateData['copyEditorAssignment.status'] = 'approved-by-author';
      updateData['copyEditorAssignment.authorApprovalDate'] = new Date();
      // Don't change main status yet - wait for copy editor confirmation
      updateData.copyEditingStage = 'awaiting-copy-editor-confirmation';
    } else {
      // If not approved, send back to copy editor
      updateData['copyEditorAssignment.status'] = 'in-progress';
      updateData.copyEditingStage = 'copy-editing';
    }

    console.log('Updating manuscript with data:', JSON.stringify(updateData, null, 2));

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('copyEditorAssignment.copyEditorId', 'name email')
     .populate('copyEditorAssignment.assignedBy', 'name email');

    console.log('Manuscript updated successfully:', {
      id: updatedManuscript._id,
      status: updatedManuscript.status,
      copyEditingStage: updatedManuscript.copyEditingStage,
      authorCopyEditReview: updatedManuscript.authorCopyEditReview
    });

    // Send notifications
    try {
      const copyEditor = updatedManuscript.copyEditorAssignment?.copyEditorId;
      const assigningEditor = updatedManuscript.copyEditorAssignment?.assignedBy;
      const authorName = session.user.name || 'Author';

      if (approved) {
        // Send approval notification to copy editor - they need to confirm and report to editor
        if (copyEditor) {
          // Use new notification function
          await notifyCopyEditorAuthorApproval(
            copyEditor.email,
            manuscript._id.toString(),
            manuscript.title,
            authorName,
            comments
          );

          // Also send email
          await sendEmail({
            to: copyEditor.email,
            subject: `Author Approved Your Copy Editing: ${manuscript.title}`,
            html: `
              <h2>Manuscript Approved by Author</h2>
              <p>Dear ${copyEditor.name},</p>
              <p>Great news! The author has approved your copy editing work for:</p>
              <h3>${manuscript.title}</h3>
              <p><strong>Author:</strong> ${authorName}</p>
              <p><strong>Approved on:</strong> ${new Date().toLocaleDateString()}</p>
              ${comments ? `<p><strong>Author Comments:</strong> ${comments}</p>` : ''}
              <p><strong>Next Steps:</strong> Please review the approval and submit your final confirmation report to the editor.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor/simple/${manuscript._id}">Complete Final Report</a></p>
            `,
          });
        }

        // Don't notify editor yet - wait for copy editor confirmation
      } else {
        // Send revision request notification to copy editor
        if (copyEditor) {
          await sendEmail({
            to: copyEditor.email,
            subject: `Revision Requested: ${manuscript.title}`,
            html: `
              <h2>Author Requested Changes</h2>
              <p>Dear ${copyEditor.name},</p>
              <p>The author has requested changes to your copy editing work for:</p>
              <h3>${manuscript.title}</h3>
              <p><strong>Author:</strong> ${authorName}</p>
              <p><strong>Requested on:</strong> ${new Date().toLocaleDateString()}</p>
              ${comments ? `<p><strong>Author Comments:</strong> ${comments}</p>` : ''}
              <p>Please review the feedback and make the necessary revisions.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor/simple/${manuscript._id}">View Assignment</a></p>
            `,
          });

          // Create in-app notification for copy editor
          await createNotification({
            recipientEmail: copyEditor.email,
            type: 'copy_edit_revision',
            title: 'Revision Requested',
            message: `Author requested changes for "${manuscript.title}"`,
            manuscriptId: manuscript._id.toString(),
            manuscriptTitle: manuscript.title,
            actionUrl: `/dashboard/copy-editor/simple/${manuscript._id}`,
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the approval if notifications fail
    }

    console.log('Update successful, sending notifications...');

    return NextResponse.json({
      success: true,
      message: approved ? 'Manuscript approved successfully' : 'Revision request sent successfully',
      manuscript: updatedManuscript,
      approved,
    });

  } catch (error) {
    console.error('Error processing author approval:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
