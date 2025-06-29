import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import stripe from '@/lib/stripe';

// GET /api/payments/[id]/status - Check payment status by polling Stripe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find the payment
    const payment = await Payment.findById(params.id);
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify user has permission to check this payment
    if (payment.userId.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If payment is already completed, return current status
    if (payment.status === 'completed' || payment.status === 'failed') {
      return NextResponse.json({
        payment: {
          id: payment._id,
          status: payment.status,
          paymentDate: payment.paymentDate,
          transactionId: payment.transactionId,
        }
      });
    }

    // If payment has a payment intent, check its status with Stripe
    if (payment.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
        
        // Update payment status based on Stripe status
        let newStatus = payment.status;
        if (paymentIntent.status === 'succeeded') {
          newStatus = 'completed';
          payment.status = 'completed';
          payment.paymentDate = new Date();
          payment.transactionId = paymentIntent.id;
          await payment.save();
          
          // Update manuscript status
          const Manuscript = require('@/models/Manuscript').default;
          await Manuscript.findByIdAndUpdate(payment.manuscriptId, {
            paymentStatus: 'completed',
            status: 'in-production',
            requiresPayment: false,
          });
        } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
          newStatus = 'failed';
          payment.status = 'failed';
          await payment.save();
        }

        return NextResponse.json({
          payment: {
            id: payment._id,
            status: newStatus,
            paymentDate: payment.paymentDate,
            transactionId: payment.transactionId,
            stripeStatus: paymentIntent.status,
          }
        });

      } catch (stripeError) {
        console.error('Failed to retrieve payment intent from Stripe:', stripeError);
        // Return current status if Stripe check fails
        return NextResponse.json({
          payment: {
            id: payment._id,
            status: payment.status,
            paymentDate: payment.paymentDate,
            transactionId: payment.transactionId,
          }
        });
      }
    }

    // Return current status if no payment intent
    return NextResponse.json({
      payment: {
        id: payment._id,
        status: payment.status,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
