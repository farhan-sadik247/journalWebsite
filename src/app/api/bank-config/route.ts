import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import BankConfig from '@/models/BankConfig';

// GET /api/bank-config - Get current bank configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const config = await BankConfig.getDefaultConfig();
    
    return NextResponse.json({
      success: true,
      config: {
        payableAmount: config.payableAmount,
        bankName: config.bankName,
        accountNumber: config.accountNumber,
        accountDetails: config.accountDetails,
        currency: config.currency,
      }
    });

  } catch (error) {
    console.error('Error fetching bank config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bank-config - Update bank configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin' && 
        !session.user.roles?.includes('admin') && 
        session.user.currentActiveRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      payableAmount,
      bankName,
      accountNumber,
      accountDetails,
      currency = 'USD'
    } = await request.json();

    if (!payableAmount || !bankName || !accountNumber || !accountDetails) {
      return NextResponse.json({
        error: 'All fields are required: payableAmount, bankName, accountNumber, accountDetails'
      }, { status: 400 });
    }

    await dbConnect();

    // Deactivate all existing configs
    await BankConfig.updateMany({}, { isActive: false });

    // Create new active config
    const newConfig = new BankConfig({
      payableAmount: Number(payableAmount),
      bankName,
      accountNumber,
      accountDetails,
      currency,
      updatedBy: session.user.id,
      isActive: true,
    });

    await newConfig.save();

    return NextResponse.json({
      success: true,
      message: 'Bank configuration updated successfully',
      config: {
        payableAmount: newConfig.payableAmount,
        bankName: newConfig.bankName,
        accountNumber: newConfig.accountNumber,
        accountDetails: newConfig.accountDetails,
        currency: newConfig.currency,
      }
    });

  } catch (error) {
    console.error('Error updating bank config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
