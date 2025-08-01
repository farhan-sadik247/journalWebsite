import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import FeeConfig from '@/models/FeeConfig';
import { Types } from 'mongoose';

export interface CreateNotificationParams {
  recipientEmail: string;
  type: 'manuscript_status' | 'payment_required' | 'payment_confirmed' | 'review_assignment' | 'review_submitted' | 'copy_edit_assigned' | 'copy_edit_approved' | 'copy_edit_complete' | 'copy_edit_revision' | 'draft_ready' | 'publication_ready' | 'system_announcement' | 'admin_action' | 'role_application';
  title: string;
  message: string;
  manuscriptId?: string;
  manuscriptTitle?: string;
  paymentId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  createdBy?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    await dbConnect();

    // Find the recipient user by email
    const recipient = await User.findOne({ email: params.recipientEmail });
    if (!recipient) {
      console.warn(`User not found with email: ${params.recipientEmail}. Skipping notification.`);
      return null; // Return null instead of throwing error
    }

    try {
      const notification = new Notification({
        recipient: recipient._id,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedManuscript: params.manuscriptId ? new Types.ObjectId(params.manuscriptId) : undefined,
        relatedPayment: params.paymentId ? new Types.ObjectId(params.paymentId) : undefined,
        metadata: {
          priority: params.priority || 'medium',
          actionUrl: params.actionUrl,
          createdBy: params.createdBy || 'system'
        }
      });

      await notification.save();
      return notification;
    } catch (saveError) {
      console.error('Error saving notification:', saveError);
      return null; // Return null instead of throwing error
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return null; // Return null instead of throwing error
  }
}

// Specific notification creators for common workflow events
export async function notifyManuscriptAccepted(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  paymentAmount: number,
  paymentId?: string
) {
  return createNotification({
    recipientEmail: authorEmail,
    type: 'manuscript_status',
    title: 'Manuscript Accepted - Payment Required',
    message: `Congratulations! Your manuscript "${manuscriptTitle}" has been accepted for publication. Please complete the payment of $${paymentAmount} to proceed with copy-editing and publication.`,
    manuscriptId,
    paymentId,
    priority: 'high',
    actionUrl: `/dashboard/payments${paymentId ? `/${paymentId}` : ''}`,
    createdBy: 'editorial_system'
  });
}

export async function notifyPaymentConfirmed(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  paymentId: string
) {
  return createNotification({
    recipientEmail: authorEmail,
    type: 'payment_confirmed',
    title: 'Payment Confirmed - Copy-Editing in Progress',
    message: `Your payment has been confirmed for "${manuscriptTitle}". Your manuscript is now being prepared for copy-editing and typesetting.`,
    manuscriptId,
    paymentId,
    priority: 'medium',
    actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
    createdBy: 'payment_system'
  });
}

export async function notifyCopyEditorAssigned(
  copyEditorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  authorName: string
) {
  return createNotification({
    recipientEmail: copyEditorEmail,
    type: 'copy_edit_assigned',
    title: 'New Copy-Editing Assignment',
    message: `You have been assigned to copy-edit "${manuscriptTitle}" by ${authorName}. Please begin the copy-editing and typesetting process.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/copy-editor/${manuscriptId}`,
    createdBy: 'editorial_system'
  });
}

export async function notifyDraftReady(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string
) {
  return createNotification({
    recipientEmail: authorEmail,
    type: 'draft_ready',
    title: 'Copy-Edited Draft Ready for Review',
    message: `The copy-edited and typeset version of "${manuscriptTitle}" is ready for your review and approval. Please check the formatting and content before final publication.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
    createdBy: 'copy_editing_system'
  });
}

export async function notifyDraftApproved(
  editorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  authorName: string
) {
  return createNotification({
    recipientEmail: editorEmail,
    type: 'publication_ready',
    title: 'Manuscript Ready for Publication',
    message: `"${manuscriptTitle}" by ${authorName} has been approved by the author and is ready for final publication. Please proceed with publication.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/editor/${manuscriptId}`,
    createdBy: 'author_approval_system'
  });
}

export async function notifyPublicationComplete(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  volumeInfo?: string
) {
  return createNotification({
    recipientEmail: authorEmail,
    type: 'manuscript_status',
    title: 'Manuscript Published Successfully',
    message: `Congratulations! "${manuscriptTitle}" has been successfully published${volumeInfo ? ` in ${volumeInfo}` : ''}. Your work is now available to the research community.`,
    manuscriptId,
    priority: 'medium',
    actionUrl: `/articles?search=${encodeURIComponent(manuscriptTitle)}`,
    createdBy: 'publication_system'
  });
}

export async function notifyReviewAssignment(
  reviewerEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  dueDate: Date
) {
  return createNotification({
    recipientEmail: reviewerEmail,
    type: 'review_assignment',
    title: 'New Review Assignment',
    message: `You have been assigned to review "${manuscriptTitle}". Please complete your review by ${dueDate.toLocaleDateString()}.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/reviewer/${manuscriptId}`,
    createdBy: 'editorial_system'
  });
}

export async function notifyAuthorReviewSubmitted(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  reviewerName?: string
) {
  const reviewerText = reviewerName ? ` by ${reviewerName}` : '';
  return createNotification({
    recipientEmail: authorEmail,
    type: 'review_submitted',
    title: 'Review Submitted for Your Manuscript',
    message: `A review has been submitted${reviewerText} for your manuscript "${manuscriptTitle}". The editorial team will review the feedback and update you on the next steps.`,
    manuscriptId,
    priority: 'medium',
    actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
    createdBy: 'review_system'
  });
}

export async function notifyAdminAction(
  recipientEmail: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  return createNotification({
    recipientEmail,
    type: 'admin_action',
    title,
    message,
    priority: 'medium',
    actionUrl,
    createdBy: 'admin_system'
  });
}

export async function notifyCopyEditChangesRequested(
  copyEditorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  comments: string
) {
  return createNotification({
    recipientEmail: copyEditorEmail,
    type: 'copy_edit_assigned',
    title: 'Author Requested Changes to Draft',
    message: `The author has requested changes to the copy-edited draft of "${manuscriptTitle}". Please review their feedback and make the necessary revisions.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/copy-editor/manuscripts/${manuscriptId}/edit`,
    createdBy: 'author_feedback_system'
  });
}

export async function notifyRoleApplicationSubmitted(
  applicantName: string,
  applicantEmail: string,
  targetRole: string
) {
  // Notify all admins about the new role application
  const admins = await User.find({ roles: 'admin' }).select('email');
  
  const notifications = admins.map(admin => 
    createNotification({
      recipientEmail: admin.email,
      type: 'role_application',
      title: 'New Role Application',
      message: `${applicantName} (${applicantEmail}) has applied for ${targetRole} role. Please review the application.`,
      priority: 'medium',
      actionUrl: '/dashboard/admin/role-applications',
      createdBy: 'role_application_system'
    })
  );

  return Promise.all(notifications);
}

export async function notifyRoleApplicationDecision(
  applicantEmail: string,
  targetRole: string,
  status: string,
  adminComments?: string
) {
  let message: string;
  if (status === 'approved') {
    message = `Your application for ${targetRole} role has been approved.`;
    if (adminComments) {
      message += ` ${adminComments}`;
    }
  } else {
    message = `Your application for ${targetRole} role has been rejected.`;
    if (adminComments) {
      message += ` ${adminComments}`;
    }
  }

  return createNotification({
    recipientEmail: applicantEmail,
    type: 'admin_action',
    title: `Role Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message,
    priority: 'high',
    actionUrl: '/profile',
    createdBy: 'admin_system'
  });
}

// Function to get fee calculation for an accepted manuscript
export async function getFeeForManuscript(
  manuscriptData: {
    articleType?: string;
    authorCountry?: string;
    institutionName?: string;
  }
) {
  try {
    await dbConnect();
    
    const feeConfig = await FeeConfig.getDefaultConfig();
    if (!feeConfig) {
      // Return default values if no config found
      return {
        baseFee: 2000,
        finalFee: 2000,
        discountAmount: 0,
        discountReason: '',
        isWaiver: false,
        currency: 'USD'
      };
    }

    const feeCalculation = feeConfig.calculateFee(
      manuscriptData.articleType || 'research',
      manuscriptData.authorCountry || 'US',
      manuscriptData.institutionName
    );

    return {
      ...feeCalculation,
      currency: feeConfig.currency,
      paymentDeadlineDays: feeConfig.paymentDeadlineDays
    };
  } catch (error) {
    console.error('Error calculating fee:', error);
    throw error;
  }
}

export async function notifyManuscriptAcceptedWithFee(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  manuscriptData: {
    articleType?: string;
    authorCountry?: string;
    institutionName?: string;
  }
) {
  try {
    const feeCalculation = await getFeeForManuscript(manuscriptData);
    
    // First notification: Manuscript acceptance
    let acceptanceNotification = null;
    try {
      acceptanceNotification = await createNotification({
        recipientEmail: authorEmail,
        type: 'manuscript_status',
        title: 'Manuscript Accepted for Publication',
        message: `Congratulations! Your manuscript "${manuscriptTitle}" has been accepted for publication. This is an important milestone in your research journey.`,
        manuscriptId,
        priority: 'high',
        actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
        createdBy: 'editorial_system'
      });
    } catch (notifError) {
      console.error('Error creating acceptance notification:', notifError);
      // Continue despite notification error
    }
    
    // Second notification: Payment requirement (if applicable)
    let paymentNotification = null;
    
    try {
      if (feeCalculation.isWaiver || feeCalculation.finalFee === 0) {
        // If fee is waived, send a notification about proceeding to production
        paymentNotification = await createNotification({
          recipientEmail: authorEmail,
          type: 'manuscript_status',
          title: 'Publication Fee Waived - Proceeding to Production',
          message: `Based on your location/institution, the publication fee for "${manuscriptTitle}" has been waived. Your manuscript will now proceed directly to copy-editing and typesetting.`,
          manuscriptId,
          priority: 'medium',
          actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
          createdBy: 'editorial_system'
        });
      } else {
        // If payment is required, send specific payment notification
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + feeCalculation.paymentDeadlineDays);
        
        const paymentMessage = `To proceed with copy-editing and typesetting of "${manuscriptTitle}", please complete the Article Processing Charge (APC) payment of ${feeCalculation.currency} $${feeCalculation.finalFee}` +
          (feeCalculation.discountAmount > 0 ? ` (${feeCalculation.discountReason})` : '') +
          `. Payment deadline: ${deadlineDate.toLocaleDateString()}.`;
        
        paymentNotification = await createNotification({
          recipientEmail: authorEmail,
          type: 'payment_required',
          title: 'Article Processing Charge (APC) Payment Required',
          message: paymentMessage,
          manuscriptId,
          priority: 'high',
          actionUrl: `/dashboard/payments/new?manuscriptId=${manuscriptId}&amount=${feeCalculation.finalFee}`,
          createdBy: 'editorial_system'
        });
      }
    } catch (notifError) {
      console.error('Error creating payment notification:', notifError);
      // Continue despite notification error
    }
    
    return {
      acceptanceNotification,
      paymentNotification,
      feeCalculation
    };
  } catch (error) {
    console.error('Error in fee calculation or notification process:', error);
    // Return partial data instead of throwing error
    return {
      acceptanceNotification: null,
      paymentNotification: null,
      feeCalculation: null,
      error
    };
  }
}

export async function notifyAuthorCopyEditComplete(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  copyEditorName: string,
  completionStatus: 'completed' | 'needs-revision',
  hasGalleyProof: boolean = false
) {
  try {
    await dbConnect();

    let title: string;
    let message: string;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    if (completionStatus === 'completed') {
      title = 'Copy Editing Completed - Review Required';
      message = `The copy editing for your manuscript "${manuscriptTitle}" has been completed by ${copyEditorName}. ` +
        (hasGalleyProof 
          ? 'A galley proof has been prepared for your review. Please check the copy-edited version and provide your feedback.'
          : 'Please review the copy-edited version and provide your feedback.'
        ) +
        ' You can view the copy editing comments and any attached files in your manuscript dashboard.';
      priority = 'high';
    } else {
      title = 'Copy Editing Review - Revision Required';
      message = `The copy editor ${copyEditorName} has reviewed your manuscript "${manuscriptTitle}" and identified areas that require revision. ` +
        'Please review the copy editor\'s comments and make the necessary revisions before resubmission. ' +
        'You can view the detailed feedback in your manuscript dashboard.';
      priority = 'high';
    }

    const notification = await createNotification({
      recipientEmail: authorEmail,
      type: 'manuscript_status',
      title,
      message,
      manuscriptId,
      priority,
      actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
      createdBy: 'copy_editor_system'
    });

    return notification;
  } catch (error) {
    console.error('Error sending copy edit completion notification:', error);
    throw error;
  }
}

export async function notifyAuthorGalleyReview(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  copyEditorName: string,
  galleyCount: number,
  notes?: string
) {
  try {
    const title = 'Galley Proofs Ready for Review';
    const message = `The copy editor ${copyEditorName} has completed the copy editing and typesetting of your manuscript "${manuscriptTitle}". ` +
      `${galleyCount} galley proof${galleyCount > 1 ? 's have' : ' has'} been prepared for your final review. ` +
      'Please review the galley proofs carefully and approve them if you are satisfied with the copy editing. ' +
      (notes ? `Copy editor notes: ${notes}` : '') +
      ' You can approve or request revisions in your manuscript dashboard.';

    const notification = await createNotification({
      recipientEmail: authorEmail,
      type: 'copy_edit_complete',
      title,
      message,
      manuscriptId,
      priority: 'high',
      actionUrl: `/dashboard/manuscripts/${manuscriptId}/simple-review`,
      createdBy: 'copy_editor_system'
    });

    return notification;
  } catch (error) {
    console.error('Error sending galley review notification:', error);
    throw error;
  }
}

export async function notifyEditorCopyEditingComplete(
  editorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  copyEditorName: string,
  authorName: string,
  reportToEditor: string,
  finalNotes?: string
) {
  try {
    const title = 'Copy Editing Process Completed';
    const message = `The copy editing process for manuscript "${manuscriptTitle}" by ${authorName} has been completed. ` +
      `Copy editor ${copyEditorName} has submitted their final report:\n\n${reportToEditor}` +
      (finalNotes ? `\n\nAdditional notes: ${finalNotes}` : '') +
      '\n\nThe manuscript is now ready for the publication stage. You can review the copy editor\'s work and proceed with publication in your editorial dashboard.';

    const notification = await createNotification({
      recipientEmail: editorEmail,
      type: 'copy_edit_complete',
      title,
      message,
      manuscriptId,
      priority: 'high',
      actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
      createdBy: 'copy_editor_system'
    });

    return notification;
  } catch (error) {
    console.error('Error sending editor completion notification:', error);
    throw error;
  }
}

export async function notifyCopyEditorAuthorApproval(
  copyEditorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  authorName: string,
  authorComments?: string
) {
  try {
    const title = 'Author Approved Your Copy Editing';
    const message = `The author ${authorName} has approved your copy editing work for manuscript "${manuscriptTitle}". ` +
      (authorComments ? `Author comments: ${authorComments}\n\n` : '') +
      'Please review the approval and submit your final confirmation report to the editor. ' +
      'You can complete the final step in your copy editor dashboard.';

    const notification = await createNotification({
      recipientEmail: copyEditorEmail,
      type: 'copy_edit_approved',
      title,
      message,
      manuscriptId,
      priority: 'high',
      actionUrl: `/dashboard/copy-editor/simple/${manuscriptId}`,
      createdBy: 'author_system'
    });

    return notification;
  } catch (error) {
    console.error('Error sending copy editor approval notification:', error);
    throw error;
  }
}

export async function notifyPaymentRejected(
  authorEmail: string,
  manuscriptId: string,
  manuscriptTitle: string,
  rejectionReason: string,
  paymentAmount: number
) {
  return createNotification({
    recipientEmail: authorEmail,
    type: 'payment_required',
    title: 'Payment Rejected - Resubmission Required',
    message: `Your payment submission for "${manuscriptTitle}" has been rejected. Reason: ${rejectionReason}. Please resubmit your payment of $${paymentAmount} to proceed with publication.`,
    manuscriptId,
    priority: 'high',
    actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
    createdBy: 'payment_system'
  });
}

export async function notifyEditorsPaymentAccepted(
  manuscriptId: string,
  manuscriptTitle: string
) {
  try {
    await dbConnect();
    
    // Find all editors
    const editors = await User.find({ 
      $or: [
        { role: 'editor' },
        { roles: { $in: ['editor'] } },
        { currentActiveRole: 'editor' }
      ]
    });
    
    if (editors.length === 0) {
      console.warn('No editors found to notify about payment acceptance');
      return [];
    }

    const notifications = editors.map(editor =>
      createNotification({
        recipientEmail: editor.email,
        type: 'copy_edit_assigned',
        title: 'Manuscript Ready for Copy Editing',
        message: `The manuscript "${manuscriptTitle}" is ready for copy editing. Payment has been confirmed and the manuscript is now in production phase.`,
        manuscriptId,
        priority: 'high',
        actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
        createdBy: 'payment_system'
      })
    );

    return Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying editors about payment acceptance:', error);
    return [];
  }
}
