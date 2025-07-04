import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ContactMessage from '@/models/ContactMessage';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { firstName, lastName, email, phone, subject, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
    });

    await contactMessage.save();

    // Get all admin users to send notification
    const adminUsers = await User.find({
      $or: [
        { role: 'admin' },
        { roles: 'admin' },
        { isFounder: true }
      ]
    }).select('email name');

    const adminEmails = adminUsers.map(admin => admin.email);

    // Send notification email to admins
    if (adminEmails.length > 0) {
      const subjectLabels = {
        submission: 'Manuscript Submission',
        review: 'Peer Review Process',
        editorial: 'Editorial Inquiry',
        technical: 'Technical Support',
        partnership: 'Partnership Opportunity',
        other: 'Other'
      };

      const emailResult = await sendEmail({
        to: adminEmails,
        subject: `New Contact Message: ${subjectLabels[subject as keyof typeof subjectLabels]}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Contact Message Received</h2>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Information:</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Subject:</strong> ${subjectLabels[subject as keyof typeof subjectLabels]}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #374151;">Message:</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
            
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;">
                <strong>Note:</strong> Please log into the admin dashboard to respond to this message and update its status.
              </p>
            </div>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              Journal Website System
            </p>
          </div>
        `,
      });

      if (!emailResult.success) {
        console.error('Failed to send admin notification email:', emailResult.error);
      }
    }

    // Send confirmation email to user
    const confirmationEmailResult = await sendEmail({
      to: email,
      subject: 'Thank you for contacting us',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank You for Your Message</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Thank you for contacting us. We have received your message and will respond as soon as possible.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Your Message Details:</h3>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0;"><strong>Date Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46;">
              <strong>What happens next?</strong><br>
              Our team will review your message and respond within 1-2 business days. 
              If your inquiry is urgent, please feel free to contact us directly at the phone numbers listed on our contact page.
            </p>
          </div>
          
          <p>
            If you have any additional questions or need immediate assistance, 
            please don't hesitate to reach out to us directly.
          </p>
          
          <p>
            Best regards,<br>
            Editorial Team<br>
            Research Journal
          </p>
        </div>
      `,
    });

    if (!confirmationEmailResult.success) {
      console.error('Failed to send confirmation email:', confirmationEmailResult.error);
    }

    return NextResponse.json(
      { 
        message: 'Message sent successfully',
        id: contactMessage._id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting contact message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve contact messages (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get total count
    const total = await ContactMessage.countDocuments(query);

    // Get messages
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('respondedBy', 'name email')
      .lean();

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
