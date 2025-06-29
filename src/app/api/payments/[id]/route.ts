import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';

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
      waiverReason
    } = await request.json();

    await dbConnect();

    const payment = await Payment.findById(params.id).populate('manuscriptId');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      
      if (status === 'completed') {
        updateData.paymentDate = new Date();
        if (transactionId) updateData.transactionId = transactionId;
        
        // Update manuscript status to in-production
        await Manuscript.findByIdAndUpdate(payment.manuscriptId._id, {
          status: 'in-production',
          paymentStatus: 'completed'
        });
      } else if (status === 'failed') {
        // Update manuscript payment status
        await Manuscript.findByIdAndUpdate(payment.manuscriptId._id, {
          paymentStatus: 'failed'
        });
      }
    }

    if (approveWaiver && payment.status === 'waived') {
      updateData.waiverApprovedBy = session.user.id;
      updateData.waiverApprovedDate = new Date();
      updateData.status = 'waived';
      
      if (waiverReason) updateData.waiverReason = waiverReason;
      
      // Update manuscript to proceed to production
      await Manuscript.findByIdAndUpdate(payment.manuscriptId._id, {
        status: 'in-production',
        paymentStatus: 'waived',
        requiresPayment: false
      });
    }

    if (notes) updateData.notes = notes;
    if (transactionId) updateData.transactionId = transactionId;

    const updatedPayment = await Payment.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('manuscriptId', 'title status')
     .populate('userId', 'name email')
     .populate('waiverApprovedBy', 'name email');

    return NextResponse.json({
      message: 'Payment updated successfully',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
