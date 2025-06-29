import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import FeeConfig from '@/models/FeeConfig';
import { Types } from 'mongoose';

export interface CreateNotificationParams {
  recipientEmail: string;
  type: 'manuscript_status' | 'payment_required' | 'payment_confirmed' | 'review_assignment' | 'review_submitted' | 'copy_edit_assigned' | 'draft_ready' | 'publication_ready' | 'system_announcement' | 'admin_action' | 'role_application';
  title: string;
  message: string;
  manuscriptId?: string;
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
      throw new Error(`User not found with email: ${params.recipientEmail}`);
    }

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
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
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
    const acceptanceNotification = await createNotification({
      recipientEmail: authorEmail,
      type: 'manuscript_status',
      title: 'Manuscript Accepted for Publication',
      message: `Congratulations! Your manuscript "${manuscriptTitle}" has been accepted for publication. This is an important milestone in your research journey.`,
      manuscriptId,
      priority: 'high',
      actionUrl: `/dashboard/manuscripts/${manuscriptId}`,
      createdBy: 'editorial_system'
    });
    
    // Second notification: Payment requirement (if applicable)
    let paymentNotification = null;
    
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
    
    return {
      acceptanceNotification,
      paymentNotification,
      feeCalculation
    };
  } catch (error) {
    console.error('Error sending acceptance notification:', error);
    throw error;
  }
}
