import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// GET /api/payments - Get payments for user or admin view
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const manuscriptId = searchParams.get('manuscriptId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = {};

    // Filter by user role
    if (session.user.role === 'admin' || session.user.role === 'editor') {
      // Admins and editors can see all payments
      if (manuscriptId) query.manuscriptId = manuscriptId;
      if (status) query.status = status;
    } else {
      // Regular users can only see their own payments
      query.userId = session.user.id;
      if (manuscriptId) query.manuscriptId = manuscriptId;
      if (status) query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('manuscriptId', 'title status')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payments - Create a payment for a manuscript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      manuscriptId,
      paymentMethod,
      billingAddress,
      requestWaiver,
      waiverReason
    } = await request.json();

    if (!manuscriptId || !paymentMethod) {
      return NextResponse.json({
        error: 'Manuscript ID and payment method are required'
      }, { status: 400 });
    }

    // Validate and normalize billing address
    console.log('Received billing address:', billingAddress);
    
    if (!billingAddress) {
      console.error('No billing address provided');
      return NextResponse.json({
        error: 'Billing address is required'
      }, { status: 400 });
    }
    
    // Ensure all required billing address fields have default values
    const normalizedBillingAddress = {
      name: (billingAddress.name && billingAddress.name.trim()) || 'Author Name Not Provided',
      institution: billingAddress.institution || '',
      address: billingAddress.address || 'Address not provided',
      city: billingAddress.city || 'City not provided',
      state: billingAddress.state || '',
      country: billingAddress.country || 'US',
      postalCode: billingAddress.postalCode || '',
    };

    console.log('Normalized billing address:', normalizedBillingAddress);
    
    // Final validation
    if (!normalizedBillingAddress.name || normalizedBillingAddress.name.trim() === '') {
      normalizedBillingAddress.name = 'Payment Author';
      console.log('FORCED name because still empty:', normalizedBillingAddress.name);
    }

    await dbConnect();

    // Check if manuscript exists and user has permission
    const manuscript = await Manuscript.findById(manuscriptId).populate('submittedBy');
    
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is the author or admin
    if (manuscript.submittedBy._id.toString() !== session.user.id && 
        session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if manuscript is accepted
    if (manuscript.status !== 'accepted') {
      return NextResponse.json({
        error: 'Payment can only be created for accepted manuscripts'
      }, { status: 400 });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ manuscriptId });
    if (existingPayment) {
      return NextResponse.json({
        error: 'Payment already exists for this manuscript'
      }, { status: 400 });
    }

    // Get fee configuration
    const feeConfig = await FeeConfig.getDefaultConfig();
    
    // Get corresponding author's country (simplified - taking first author's country)
    const correspondingAuthor = manuscript.authors.find((author: any) => author.isCorresponding);
    const authorCountry = correspondingAuthor?.country || 'US'; // Default to US if not specified
    const institutionName = correspondingAuthor?.affiliation || '';

    // Calculate fee
    const feeCalculation = feeConfig.calculateFee(
      manuscript.category || 'research',
      authorCountry,
      institutionName
    );

    // Create payment record
    const paymentData: any = {
      manuscriptId,
      userId: session.user.id,
      amount: feeCalculation.finalFee,
      baseFee: feeCalculation.baseFee,
      discountAmount: feeCalculation.discountAmount,
      discountReason: feeCalculation.discountReason,
      paymentMethod,
      billingAddress: normalizedBillingAddress,
      dueDate: new Date(Date.now() + feeConfig.paymentDeadlineDays * 24 * 60 * 60 * 1000),
    };

    // Handle waiver request or automatic waiver
    if (requestWaiver || feeCalculation.isWaiver) {
      paymentData.status = 'waived';
      paymentData.paymentMethod = 'waiver';
      paymentData.waiverReason = waiverReason || feeCalculation.discountReason || 'Waiver requested';
      paymentData.amount = 0;
      if (feeCalculation.isWaiver) {
        paymentData.waiverApprovedDate = new Date();
        // Auto-approve for certain countries
      }
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Update manuscript
    await Manuscript.findByIdAndUpdate(manuscriptId, {
      requiresPayment: !feeCalculation.isWaiver && !requestWaiver,
      paymentStatus: feeCalculation.isWaiver ? 'waived' : (requestWaiver ? 'waived' : 'pending'),
      apcAmount: feeCalculation.finalFee,
      paymentDeadline: paymentData.dueDate,
      status: feeCalculation.isWaiver ? 'in-production' : 'payment-required'
    });

    return NextResponse.json({
      message: 'Payment created successfully',
      payment: payment.toObject(),
      feeCalculation
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
