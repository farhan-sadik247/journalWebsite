import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import stripe from '@/lib/stripe';

// POST /api/payments/[id]/confirm - Confirm payment status without webhook
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIntentId, status, transactionId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({
        error: 'Payment intent ID is required'
      }, { status: 400 });
    }

    await dbConnect();

    // Find the payment
    const payment = await Payment.findById(params.id).populate('manuscriptId');
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify user has permission to update this payment
    if (payment.userId.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the payment intent with Stripe to ensure it's actually paid
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      console.error('Failed to retrieve payment intent from Stripe:', stripeError);
      return NextResponse.json({
        error: 'Failed to verify payment with Stripe'
      }, { status: 400 });
    }

    // Only update if payment intent is actually succeeded
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({
        error: `Payment not successful. Status: ${paymentIntent.status}`
      }, { status: 400 });
    }

    // Update payment record
    payment.status = 'completed';
    payment.paymentIntentId = paymentIntentId;
    payment.transactionId = transactionId || paymentIntentId;
    payment.paymentDate = new Date();

    await payment.save();

    // Update manuscript status
    if (payment.manuscriptId) {
      await Manuscript.findByIdAndUpdate(payment.manuscriptId._id, {
        paymentStatus: 'completed',
        status: 'in-production', // Move to next stage after payment
        requiresPayment: false,
      });
    }

    console.log(`Payment ${payment._id} confirmed successfully via client-side confirmation`);

    return NextResponse.json({
      message: 'Payment confirmed successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
