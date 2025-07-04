import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean, error?: any }> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    // Instead of throwing an error, return failure status
    return { 
      success: false, 
      error 
    };
  }
}

// Email templates
export const emailTemplates = {
  manuscriptSubmitted: (authorName: string, manuscriptTitle: string, manuscriptId: string) => ({
    subject: 'Manuscript Submission Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Manuscript Submission Confirmation</h2>
        <p>Dear ${authorName},</p>
        <p>Thank you for submitting your manuscript to our journal. Your submission has been received and is now under review.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Manuscript Details:</h3>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${manuscriptTitle}</p>
          <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Under Review</p>
        </div>
        <p>You will receive updates on the review process via email. You can also track the status of your submission by logging into your account.</p>
        <p>Best regards,<br>Editorial Team</p>
      </div>
    `,
  }),

  reviewerInvitation: (reviewerName: string, manuscriptTitle: string, dueDate: string) => ({
    subject: 'Invitation to Review Manuscript',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Review Invitation</h2>
        <p>Dear ${reviewerName},</p>
        <p>You have been invited to review the following manuscript:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">${manuscriptTitle}</h3>
          <p style="margin: 5px 0;"><strong>Review Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please log into your account to accept or decline this review invitation.</p>
        <p>Thank you for your contribution to the peer review process.</p>
        <p>Best regards,<br>Editorial Team</p>
      </div>
    `,
  }),

  reviewCompleted: (authorName: string, manuscriptTitle: string, decision: string) => ({
    subject: 'Review Completed - Decision Available',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Review Decision Available</h2>
        <p>Dear ${authorName},</p>
        <p>The peer review for your manuscript has been completed.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">${manuscriptTitle}</h3>
          <p style="margin: 5px 0;"><strong>Decision:</strong> ${decision}</p>
        </div>
        <p>Please log into your account to view the detailed review comments and next steps.</p>
        <p>Best regards,<br>Editorial Team</p>
      </div>
    `,
  }),

  manuscriptAccepted: (authorName: string, manuscriptTitle: string) => ({
    subject: 'Manuscript Accepted for Publication',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Manuscript Accepted!</h2>
        <p>Dear ${authorName},</p>
        <p>Congratulations! Your manuscript has been accepted for publication.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">${manuscriptTitle}</h3>
          <p style="margin: 5px 0; color: #065f46;"><strong>Status:</strong> Accepted</p>
        </div>
        <p>Your manuscript will now proceed to the production phase. We will contact you with further details regarding publication timeline and final proofs.</p>
        <p>Thank you for choosing our journal for your research publication.</p>
        <p>Best regards,<br>Editorial Team</p>
      </div>
    `,
  }),

  contactMessage: (name: string, email: string, subject: string, message: string) => ({
    subject: `New Contact Message: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Contact Message Received</h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Information:</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Message:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;">
            <strong>Note:</strong> Please log into the admin dashboard to respond to this message.
          </p>
        </div>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          Journal Website System
        </p>
      </div>
    `,
  }),
};
