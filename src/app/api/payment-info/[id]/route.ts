import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import PaymentInfo from '@/models/PaymentInfo';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyPaymentConfirmed, notifyPaymentRejected, notifyEditorsPaymentAccepted } from '@/lib/notificationUtils';

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

    // Parse request body
    let parsedBody;
    
    try {
      parsedBody = await request.json();
    } catch (error) {
      console.error('JSON parse error:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { action, rejectionReason, notes } = parsedBody;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({
        error: 'Valid action required: accept or reject'
      }, { status: 400 });
    }

    // For reject actions, use provided reason or default to "Wrong TrxID!!"
    const finalRejectionReason = action === 'reject' ? (rejectionReason || 'Wrong TrxID!!') : undefined;

    await dbConnect();
    
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection not established');
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
          await Payment.findByIdAndUpdate(
            paymentInfo.relatedPayment._id, 
            {
              status: 'completed',
              paymentDate: new Date(),
            },
            { session: session_db, new: true }
          );
        }
        
        // Update manuscript status (only if manuscript exists)
        if (paymentInfo.manuscriptId && paymentInfo.manuscriptId._id) {
          await Manuscript.findByIdAndUpdate(
            paymentInfo.manuscriptId._id, 
            {
              paymentStatus: 'completed',
              status: 'in-production'
            },
            { session: session_db, new: true }
          );
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

        // Notify editors that manuscript is ready for copy editing
        if (paymentInfo.manuscriptId) {
          await notifyEditorsPaymentAccepted(
            paymentInfo.manuscriptId._id.toString(),
            paymentInfo.manuscriptId.title
          );
        }
      } else if (action === 'reject') {
        updateData.status = 'rejected';
        updateData.rejectionReason = finalRejectionReason;
        
        // Only update the related Payment record if it exists
        // For simple payment submissions, we might not have a related Payment record
        if (paymentInfo.relatedPayment) {
          await Payment.findByIdAndUpdate(
            paymentInfo.relatedPayment._id, 
            {
              status: 'pending',
              paymentDate: null,
            },
            { session: session_db, new: true }
          );
        }
        
        // Update manuscript status (only if manuscript exists)
        if (paymentInfo.manuscriptId && paymentInfo.manuscriptId._id) {
          await Manuscript.findByIdAndUpdate(
            paymentInfo.manuscriptId._id, 
            {
              paymentStatus: 'pending',
              status: 'payment-required' // Reset to payment-required so author can resubmit
            },
            { session: session_db, new: true }
          );
        }

        // Send notification to author that payment is rejected
        const author = await User.findById(paymentInfo.userId);
        if (author && paymentInfo.manuscriptId) {
          await notifyPaymentRejected(
            author.email,
            paymentInfo.manuscriptId._id.toString(),
            paymentInfo.manuscriptId.title,
            finalRejectionReason,
            paymentInfo.amount
          );
        }
      }

      if (notes) updateData.notes = notes;
      
      // Update the payment info
      const paymentInfoToUpdate = await PaymentInfo.findById(params.id).session(session_db);
      if (!paymentInfoToUpdate) {
        throw new Error(`PaymentInfo ${params.id} not found when trying to update`);
      }
      
      // Apply all updates
      Object.keys(updateData).forEach(key => {
        paymentInfoToUpdate[key] = updateData[key];
      });
      
      // Save the changes
      await paymentInfoToUpdate.save({ session: session_db });
      
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
      return NextResponse.json({ error: 'Failed to update payment info' }, { status: 500 });
    }

    // The code has been moved inside the transaction handling

  } catch (error) {
    console.error('Error updating payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
