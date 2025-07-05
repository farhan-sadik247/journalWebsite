import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyPaymentConfirmed } from '@/lib/notificationUtils';

// GET /api/payments/[id] - Get specific payment
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

    const payment = await Payment.findById(params.id)
      .populate('manuscriptId', 'title status authors')
      .populate('userId', 'name email')
      .populate('waiverApprovedBy', 'name email');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check permissions
    if (payment.userId._id.toString() !== session.user.id && 
        session.user.role !== 'admin' && 
        session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ payment });

  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update payment (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and editors can update payments
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const {
      status,
      transactionId,
      notes,
      approveWaiver,
      waiverReason,
      action,
      rejectionReason
    } = await request.json();

    await dbConnect();

    const payment = await Payment.findById(params.id).populate('manuscriptId').populate('userId');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const updateData: any = {};

    // Use a transaction to ensure all updates are atomic
    const session_db = await mongoose.startSession();
    session_db.startTransaction();
    
    try {
      // Handle editor actions for payment information acceptance/rejection
      if (action === 'accept') {
        updateData.status = 'completed';
        updateData.paymentDate = new Date();
        
        // Update manuscript status to in-production and mark payment as completed
        await Manuscript.findByIdAndUpdate(
          payment.manuscriptId._id, 
          {
            status: 'in-production',
            paymentStatus: 'completed'
          },
          { session: session_db }
        );

        // Notify author that payment is confirmed and copy-editing can begin
        if (payment.userId) {
          await notifyPaymentConfirmed(
            payment.userId.email,
            payment.manuscriptId._id.toString(),
            payment.manuscriptId.title,
            payment._id.toString()
          );
        }
      } else if (action === 'reject') {
        console.log('Rejecting payment in transaction:', params.id);
        updateData.status = 'pending';
        updateData.paymentDate = null;
        updateData.rejectionReason = rejectionReason;
        
        // Reset manuscript payment status to pending and allow resubmission
        const manuscriptUpdate = await Manuscript.findByIdAndUpdate(
          payment.manuscriptId._id, 
          {
            status: 'payment-required',
            paymentStatus: 'pending'
          },
          { session: session_db, new: true }
        );

        // Import and notify author that payment is rejected
        const { notifyPaymentRejected } = await import('@/lib/notificationUtils');
        if (payment.userId && rejectionReason) {
          await notifyPaymentRejected(
            payment.userId.email,
            payment.manuscriptId._id.toString(),
            payment.manuscriptId.title,
            rejectionReason,
            payment.amount || 0
          );
        }
    } else if (status) {
      updateData.status = status;
      
      if (status === 'completed') {
        updateData.paymentDate = new Date();
        if (transactionId) updateData.transactionId = transactionId;
        
        // Update manuscript status to in-production
        await Manuscript.findByIdAndUpdate(
          payment.manuscriptId._id, 
          {
            status: 'in-production',
            paymentStatus: 'completed'
          },
          { session: session_db }
        );

        // Notify author that payment is confirmed and copy-editing can begin
        const user = await User.findById(payment.userId);
        if (user) {
          await notifyPaymentConfirmed(
            user.email,
            payment.manuscriptId._id.toString(),
            payment.manuscriptId.title,
            payment._id.toString()
          );
        }
      } else if (status === 'failed') {
        // Update manuscript payment status
        await Manuscript.findByIdAndUpdate(
          payment.manuscriptId._id, 
          {
            paymentStatus: 'failed'
          },
          { session: session_db }
        );
      }
    }

    if (approveWaiver && payment.status === 'waived') {
      updateData.waiverApprovedBy = session.user.id;
      updateData.waiverApprovedDate = new Date();
      updateData.status = 'waived';
      
      if (waiverReason) updateData.waiverReason = waiverReason;
      
      // Update manuscript to proceed to production
      await Manuscript.findByIdAndUpdate(
        payment.manuscriptId._id, 
        {
          status: 'in-production',
          paymentStatus: 'waived',
          requiresPayment: false
        },
        { session: session_db }
      );
    }

    if (notes) updateData.notes = notes;
    if (transactionId) updateData.transactionId = transactionId;

    // Use findOneAndUpdate with a direct find-modify-save approach for better reliability
    const paymentToUpdate = await Payment.findById(params.id).session(session_db);
    if (!paymentToUpdate) {
      throw new Error(`Payment ${params.id} not found when trying to update`);
    }
    
    console.log('Before update - Payment status:', paymentToUpdate.status);
    
    // Apply all updates
    Object.keys(updateData).forEach(key => {
      paymentToUpdate[key] = updateData[key];
    });
    
    // Save the changes explicitly
    await paymentToUpdate.save({ session: session_db });
    console.log('After direct save - Payment status:', paymentToUpdate.status);
    
    // Commit the transaction
    await session_db.commitTransaction();
    
    // Get fully populated version to return
    const updatedPayment = await Payment.findById(params.id)
      .populate('manuscriptId', 'title status')
      .populate('userId', 'name email')
      .populate('waiverApprovedBy', 'name email');
      
      return NextResponse.json({
        message: 'Payment updated successfully',
        payment: updatedPayment
      });
      
    } catch (error) {
      // Abort the transaction on error
      await session_db.abortTransaction();
      console.error('Error in transaction when updating payment:', error);
      
      // Try a direct update without transaction as a fallback
      try {
        console.log('Transaction failed, trying direct update without transaction');
        
        // Direct update without transaction
        const directUpdate = await Payment.findById(params.id);
        if (directUpdate) {
          // Apply the status update directly
          if (action === 'reject') {
            directUpdate.status = 'pending';
            directUpdate.paymentDate = null;
            directUpdate.rejectionReason = rejectionReason;
          } else if (action === 'accept') {
            directUpdate.status = 'completed';
            directUpdate.paymentDate = new Date();
          } else if (status) {
            directUpdate.status = status;
          }
          
          await directUpdate.save();
          console.log('Direct update successful, status:', directUpdate.status);
          
          // Get fully populated version to return
          const fallbackResponse = await Payment.findById(params.id)
            .populate('manuscriptId', 'title status')
            .populate('userId', 'name email')
            .populate('waiverApprovedBy', 'name email');
          
          return NextResponse.json({
            message: 'Payment updated successfully (fallback method)',
            payment: fallbackResponse
          });
        }
      } catch (fallbackError) {
        console.error('Fallback update also failed:', fallbackError);
      }
      
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    } finally {
      session_db.endSession();
    }

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
