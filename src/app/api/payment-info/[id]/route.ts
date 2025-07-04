import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import PaymentInfo from '@/models/PaymentInfo';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyPaymentConfirmed, notifyPaymentRejected } from '@/lib/notificationUtils';

// GET /api/payment-info/[id] - Get specific payment info
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

    const paymentInfo = await PaymentInfo.findById(params.id)
      .populate('manuscriptId', 'title status')
      .populate('userId', 'name email')
      .populate('verifiedBy', 'name email');

    if (!paymentInfo) {
      return NextResponse.json({ error: 'Payment information not found' }, { status: 404 });
    }

    // Check if referenced data exists
    if (!paymentInfo.userId) {
      console.error(`Payment info ${params.id} references a user that no longer exists`);
      return NextResponse.json({ 
        error: 'Referenced user not found. This payment info may be corrupted.' 
      }, { status: 400 });
    }

    // Check if user has permission to view this payment info
    const isAdmin = session.user.role === 'admin' || session.user.role === 'editor';
    const isOwner = paymentInfo.userId._id.toString() === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      paymentInfo
    });

  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payment-info/[id] - Update payment info status (admin/editor only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or editor
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Admin or editor access required' }, { status: 403 });
    }

    const {
      action,
      rejectionReason,
      notes
    } = await request.json();

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({
        error: 'Valid action required: accept or reject'
      }, { status: 400 });
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json({
        error: 'Rejection reason is required when rejecting payment'
      }, { status: 400 });
    }

    const conn = await dbConnect();
    console.log(`MongoDB connection state: ${mongoose.connection.readyState}`); // 1 = connected
    
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection not established before query');
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const paymentInfo = await PaymentInfo.findById(params.id)
      .populate('manuscriptId')
      .populate('relatedPayment');

    if (!paymentInfo) {
      return NextResponse.json({ error: 'Payment information not found' }, { status: 404 });
    }

    // Check if the referenced manuscript exists
    if (!paymentInfo.manuscriptId) {
      console.error(`Payment info ${params.id} references a manuscript that no longer exists`);
      return NextResponse.json({ 
        error: 'Referenced manuscript not found. This payment info may be corrupted.' 
      }, { status: 400 });
    }

    // Update payment info
    const updateData: any = {
      verifiedBy: session.user.id,
      verifiedAt: new Date(),
    };

    // Use a transaction to ensure all updates are atomic
    const session_db = await mongoose.startSession();
    session_db.startTransaction();
    
    try {
      if (action === 'accept') {
        updateData.status = 'completed';
        
        // Update the related Payment record to completed
        if (paymentInfo.relatedPayment) {
          const paymentUpdate = await Payment.findByIdAndUpdate(
            paymentInfo.relatedPayment._id, 
            {
              status: 'completed',
              paymentDate: new Date(),
            },
            { session: session_db, new: true }
          );
          console.log('Updated related payment:', paymentUpdate ? paymentUpdate._id : 'Failed');
        }
        
        // Update manuscript status (only if manuscript exists)
        if (paymentInfo.manuscriptId && paymentInfo.manuscriptId._id) {
          const manuscriptUpdate = await Manuscript.findByIdAndUpdate(
            paymentInfo.manuscriptId._id, 
            {
              paymentStatus: 'completed',
              status: 'in-production'
            },
            { session: session_db, new: true }
          );
          console.log('Updated manuscript:', manuscriptUpdate ? manuscriptUpdate._id : 'Failed');
        }

        // Send notification to author that payment is confirmed
        const author = await User.findById(paymentInfo.userId);
        if (author && paymentInfo.manuscriptId) {
          await notifyPaymentConfirmed(
            author.email,
            paymentInfo.manuscriptId._id.toString(),
            paymentInfo.manuscriptId.title,
            paymentInfo.relatedPayment ? paymentInfo.relatedPayment._id.toString() : paymentInfo._id.toString()
          );
        }
      } else if (action === 'reject') {
        updateData.status = 'rejected';
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        
        // Update the related Payment record back to pending
        if (paymentInfo.relatedPayment) {
          const paymentUpdate = await Payment.findByIdAndUpdate(
            paymentInfo.relatedPayment._id, 
            {
              status: 'pending',
              paymentDate: null,
            },
            { session: session_db, new: true }
          );
          console.log('Updated related payment (rejection):', paymentUpdate ? paymentUpdate._id : 'Failed');
        }
        
        // Update manuscript status (only if manuscript exists)
        if (paymentInfo.manuscriptId && paymentInfo.manuscriptId._id) {
          const manuscriptUpdate = await Manuscript.findByIdAndUpdate(
            paymentInfo.manuscriptId._id, 
            {
              paymentStatus: 'pending'
            },
            { session: session_db, new: true }
          );
          console.log('Updated manuscript (rejection):', manuscriptUpdate ? manuscriptUpdate._id : 'Failed');
        }

        // Send notification to author that payment is rejected
        const author = await User.findById(paymentInfo.userId);
        if (author && paymentInfo.manuscriptId) {
          await notifyPaymentRejected(
            author.email,
            paymentInfo.manuscriptId._id.toString(),
            paymentInfo.manuscriptId.title,
            rejectionReason || 'No reason provided',
            paymentInfo.amount
          );
        }
      }

      if (notes) updateData.notes = notes;
      
      // Update the payment info as the final step in the transaction
      // Instead of findByIdAndUpdate, use a more explicit find-modify-save approach
      const paymentInfoToUpdate = await PaymentInfo.findById(params.id).session(session_db);
      if (!paymentInfoToUpdate) {
        throw new Error(`PaymentInfo ${params.id} not found when trying to update`);
      }
      
      console.log('Before update - Payment info status:', paymentInfoToUpdate.status);
      
      // Apply all updates
      Object.keys(updateData).forEach(key => {
        paymentInfoToUpdate[key] = updateData[key];
      });
      
      // Save the changes explicitly
      await paymentInfoToUpdate.save({ session: session_db });
      console.log('After direct save - Payment info status:', paymentInfoToUpdate.status);
      
      // Get the fully populated document to return
      const updatedPaymentInfo = await PaymentInfo.findById(params.id)
        .session(session_db)
        .populate('manuscriptId')
        .populate('userId')
        .populate('verifiedBy');

      if (!updatedPaymentInfo) {
        throw new Error(`Failed to update PaymentInfo ${params.id}`);
      }
      
      // Commit the transaction
      await session_db.commitTransaction();
      session_db.endSession();
      
      console.log(`Payment Info ${params.id} ${action}ed successfully. New status: ${updatedPaymentInfo.status}`);
      console.log(`Updated document:`, JSON.stringify(updatedPaymentInfo, null, 2));
      
      return NextResponse.json({
        success: true,
        message: `Payment ${action}ed successfully`,
        paymentInfo: updatedPaymentInfo
      });
      
    } catch (error) {
      // Abort the transaction on error
      await session_db.abortTransaction();
      session_db.endSession();
      
      console.error('Error in transaction when updating payment info:', error);
      
      // Try a direct update without transaction as a fallback
      try {
        console.log('Transaction failed, trying direct update without transaction');
        
        // Direct update without transaction
        const directUpdate = await PaymentInfo.findById(params.id);
        if (directUpdate) {
          // Apply the status update directly
          directUpdate.status = updateData.status;
          directUpdate.verifiedBy = updateData.verifiedBy;
          directUpdate.verifiedAt = updateData.verifiedAt;
          
          if (updateData.rejectionReason) {
            directUpdate.rejectionReason = updateData.rejectionReason;
          }
          
          await directUpdate.save();
          console.log('Direct update successful, status:', directUpdate.status);
          
          // Get fully populated version to return
          const fallbackResponse = await PaymentInfo.findById(params.id)
            .populate('manuscriptId')
            .populate('userId')
            .populate('verifiedBy');
          
          return NextResponse.json({
            success: true,
            message: `Payment ${action}ed successfully (fallback method)`,
            paymentInfo: fallbackResponse
          });
        }
      } catch (fallbackError) {
        console.error('Fallback update also failed:', fallbackError);
      }
      
      return NextResponse.json({ error: 'Failed to update payment info' }, { status: 500 });
    }

    // The code has been moved inside the transaction handling

  } catch (error) {
    console.error('Error updating payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
