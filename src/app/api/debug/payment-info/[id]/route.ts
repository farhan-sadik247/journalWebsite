import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import PaymentInfo from '@/models/PaymentInfo';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';

// GET /api/debug/payment-info/[id] - Debug specific payment info
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin/editor access for debugging
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();

    // Get payment info without populate to see raw data
    const paymentInfoRaw = await PaymentInfo.findById(params.id).lean() as any;
    
    if (!paymentInfoRaw) {
      return NextResponse.json({ 
        error: 'Payment information not found',
        id: params.id 
      }, { status: 404 });
    }

    // Check each referenced document separately
    let manuscript = null;
    let user = null;
    let verifiedBy = null;
    
    const diagnostics = {
      paymentInfoId: params.id,
      paymentInfoExists: true,
      manuscriptIdRef: paymentInfoRaw.manuscriptId?.toString(),
      userIdRef: paymentInfoRaw.userId?.toString(),
      verifiedByRef: paymentInfoRaw.verifiedBy?.toString(),
      manuscriptExists: false,
      userExists: false,
      verifiedByExists: false,
      errors: [] as string[]
    };

    // Check manuscript
    if (paymentInfoRaw.manuscriptId) {
      try {
        manuscript = await Manuscript.findById(paymentInfoRaw.manuscriptId);
        diagnostics.manuscriptExists = !!manuscript;
        if (!manuscript) {
          diagnostics.errors.push(`Manuscript ${paymentInfoRaw.manuscriptId} not found`);
        }
      } catch (error: any) {
        diagnostics.errors.push(`Error checking manuscript: ${error.message}`);
      }
    } else {
      diagnostics.errors.push('No manuscriptId in payment info');
    }

    // Check user
    if (paymentInfoRaw.userId) {
      try {
        user = await User.findById(paymentInfoRaw.userId);
        diagnostics.userExists = !!user;
        if (!user) {
          diagnostics.errors.push(`User ${paymentInfoRaw.userId} not found`);
        }
      } catch (error: any) {
        diagnostics.errors.push(`Error checking user: ${error.message}`);
      }
    } else {
      diagnostics.errors.push('No userId in payment info');
    }

    // Check verifiedBy if exists
    if (paymentInfoRaw.verifiedBy) {
      try {
        verifiedBy = await User.findById(paymentInfoRaw.verifiedBy);
        diagnostics.verifiedByExists = !!verifiedBy;
        if (!verifiedBy) {
          diagnostics.errors.push(`VerifiedBy user ${paymentInfoRaw.verifiedBy} not found`);
        }
      } catch (error: any) {
        diagnostics.errors.push(`Error checking verifiedBy: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      paymentInfoRaw,
      manuscript: manuscript ? { _id: manuscript._id, title: manuscript.title, status: manuscript.status } : null,
      user: user ? { _id: user._id, name: user.name, email: user.email } : null,
      verifiedBy: verifiedBy ? { _id: verifiedBy._id, name: verifiedBy.name, email: verifiedBy.email } : null
    });

  } catch (error: any) {
    console.error('Error debugging payment info:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
