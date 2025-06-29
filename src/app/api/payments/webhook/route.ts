import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import stripe from '@/lib/stripe';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyPaymentConfirmed } from '@/lib/notificationUtils';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received Stripe webhook event:', event.type);

    await dbConnect();

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(paymentIntent: any) {
  try {
    const payment = await Payment.findOne({ 
      paymentIntentId: paymentIntent.id 
    }).populate('manuscriptId').populate('userId');

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Update payment status
    await Payment.findByIdAndUpdate(payment._id, {
      status: 'completed',
      paymentDate: new Date(),
      transactionId: paymentIntent.id,
    });

    // Update manuscript status
    await Manuscript.findByIdAndUpdate(payment.manuscriptId._id, {
      status: 'in-production',
      paymentStatus: 'completed',
    });

    // Send notification to author
    if (payment.userId) {
      try {
        await notifyPaymentConfirmed(
          payment.userId.email,
          payment.manuscriptId._id.toString(),
          payment.manuscriptId.title,
          payment._id.toString()
        );
      } catch (notificationError) {
        console.error('Failed to send payment confirmation notification:', notificationError);
      }
    }

    console.log('Payment completed successfully:', payment._id);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: any) {
  try {
    const payment = await Payment.findOne({ 
      paymentIntentId: paymentIntent.id 
    });

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Update payment status
    await Payment.findByIdAndUpdate(payment._id, {
      status: 'failed',
    });

    // Update manuscript payment status
    await Manuscript.findByIdAndUpdate(payment.manuscriptId, {
      paymentStatus: 'failed',
    });

    console.log('Payment failed for payment:', payment._id);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentCanceled(paymentIntent: any) {
  try {
    const payment = await Payment.findOne({ 
      paymentIntentId: paymentIntent.id 
    });

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Reset payment status to pending
    await Payment.findByIdAndUpdate(payment._id, {
      status: 'pending',
      paymentIntentId: null,
    });

    console.log('Payment canceled for payment:', payment._id);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}
