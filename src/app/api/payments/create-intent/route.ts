import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import stripe from '@/lib/stripe';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Get payment record
    const payment = await Payment.findById(paymentId)
      .populate('manuscriptId', 'title')
      .populate('userId', 'name email');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check if user owns this payment
    if (payment.userId._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if payment is pending
    if (payment.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Payment is not in pending status' 
      }, { status: 400 });
    }

    // Check if amount is greater than 0
    if (payment.amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid payment amount' 
      }, { status: 400 });
    }

    let paymentIntent;

    // Check if PaymentIntent already exists
    if (payment.paymentIntentId) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
        
        // If the payment intent is already succeeded, return success
        if (paymentIntent.status === 'succeeded') {
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            status: 'succeeded'
          });
        }
        
        // If amount has changed, update the payment intent
        if (paymentIntent.amount !== Math.round(payment.amount * 100)) {
          paymentIntent = await stripe.paymentIntents.update(payment.paymentIntentId, {
            amount: Math.round(payment.amount * 100),
          });
        }
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
        // If the payment intent doesn't exist anymore, create a new one
        paymentIntent = null;
      }
    }

    // Create new PaymentIntent if none exists
    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: payment.currency.toLowerCase(),
        metadata: {
          paymentId: payment._id.toString(),
          manuscriptId: payment.manuscriptId._id.toString(),
          manuscriptTitle: payment.manuscriptId.title,
          userEmail: payment.userId.email,
          invoiceNumber: payment.invoiceNumber || '',
        },
        description: `Article Processing Charge for manuscript: ${payment.manuscriptId.title}`,
        receipt_email: payment.userId.email,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update payment with PaymentIntent ID
      await Payment.findByIdAndUpdate(paymentId, {
        paymentIntentId: paymentIntent.id,
        status: 'processing'
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: payment.amount,
      currency: payment.currency,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent' 
    }, { status: 500 });
  }
}
