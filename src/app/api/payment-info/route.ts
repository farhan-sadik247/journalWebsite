import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import PaymentInfo from '@/models/PaymentInfo';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import BankConfig from '@/models/BankConfig';

// GET /api/payment-info - Get payment information for user or admin
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
      // Admins and editors can see all payment info
      if (manuscriptId) query.manuscriptId = manuscriptId;
      if (status) query.status = status;
    } else {
      // Regular users can only see their own payment info
      query.userId = session.user.id;
      if (manuscriptId) query.manuscriptId = manuscriptId;
      if (status) query.status = status;
    }

    const paymentInfos = await PaymentInfo.find(query)
      .populate('manuscriptId', 'title status')
      .populate('userId', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await PaymentInfo.countDocuments(query);

    return NextResponse.json({
      paymentInfos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payment-info - Submit payment information
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      manuscriptId,
      accountHolderName,
      transactionId
    } = await request.json();

    if (!manuscriptId || !accountHolderName || !transactionId) {
      return NextResponse.json({
        error: 'All fields are required: manuscriptId, accountHolderName, transactionId'
      }, { status: 400 });
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
        error: 'Payment information can only be submitted for accepted manuscripts'
      }, { status: 400 });
    }

    // Check if payment info already exists for this manuscript
    const existingPaymentInfo = await PaymentInfo.findOne({ manuscriptId });
    if (existingPaymentInfo && existingPaymentInfo.status !== 'rejected') {
      return NextResponse.json({
        error: 'Payment information already submitted for this manuscript'
      }, { status: 400 });
    }

    // Get bank config to get the payable amount
    const bankConfig = await BankConfig.getDefaultConfig();

    // First, find or create a Payment record for this manuscript
    let payment = await Payment.findOne({ manuscriptId });
    
    if (!payment) {
      // Create a new Payment record if one doesn't exist
      payment = new Payment({
        manuscriptId,
        userId: session.user.id,
        amount: bankConfig.payableAmount,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'bank_transfer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        baseFee: bankConfig.payableAmount,
        billingAddress: {
          name: accountHolderName,
          institution: '',
          address: 'Bank Transfer Payment',
          city: 'N/A',
          country: 'N/A',
        },
      });
      await payment.save();
    }

    // Create payment info record
    const paymentInfo = new PaymentInfo({
      manuscriptId,
      userId: session.user.id,
      accountHolderName,
      amount: bankConfig.payableAmount,
      transactionId,
      invoiceNumber: payment.invoiceNumber,
      relatedPayment: payment._id,
      status: 'pending',
    });

    await paymentInfo.save();

    // Update the payment record with the transaction ID
    await Payment.findByIdAndUpdate(payment._id, {
      transactionId,
      status: 'pending' // Payment info submitted, waiting for verification
    });

    // Update manuscript status
    await Manuscript.findByIdAndUpdate(manuscriptId, {
      status: 'payment-submitted',
      paymentStatus: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment information submitted successfully',
      paymentInfo: {
        _id: paymentInfo._id,
        accountHolderName: paymentInfo.accountHolderName,
        amount: paymentInfo.amount,
        transactionId: paymentInfo.transactionId,
        status: paymentInfo.status,
        createdAt: paymentInfo.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
