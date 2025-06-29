import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// GET /api/fee-config - Get fee configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const feeConfig = await FeeConfig.getDefaultConfig();

    return NextResponse.json({ feeConfig });

  } catch (error) {
    console.error('Error fetching fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/fee-config - Create or update fee configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin
    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const feeConfigData = await request.json();

    // Validate required fields
    if (!feeConfigData.name || feeConfigData.baseFee === undefined) {
      return NextResponse.json({ 
        error: 'Name and base fee are required' 
      }, { status: 400 });
    }

    // Check if a config with this name already exists
    let existingConfig = await FeeConfig.findOne({ name: feeConfigData.name });

    if (existingConfig) {
      // Update existing config
      Object.assign(existingConfig, {
        ...feeConfigData,
        lastModifiedBy: user._id,
        updatedAt: new Date()
      });
      await existingConfig.save();
      
      return NextResponse.json({ 
        message: 'Fee configuration updated successfully',
        feeConfig: existingConfig
      });
    } else {
      // Create new config
      const newFeeConfig = new FeeConfig({
        ...feeConfigData,
        createdBy: user._id,
        lastModifiedBy: user._id
      });
      
      await newFeeConfig.save();
      
      return NextResponse.json({ 
        message: 'Fee configuration created successfully',
        feeConfig: newFeeConfig
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error saving fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/fee-config/calculate - Calculate fee for manuscript
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleType, authorCountry, institutionName } = await request.json();

    console.log('Fee calculation request:', { articleType, authorCountry, institutionName });

    if (!articleType || !authorCountry) {
      return NextResponse.json({
        error: 'Article type and author country are required'
      }, { status: 400 });
    }

    await dbConnect();

    const feeConfig = await FeeConfig.getDefaultConfig();
    
    if (!feeConfig) {
      console.error('No default fee configuration found');
      return NextResponse.json({ 
        error: 'Fee configuration not available. Please contact administrator.' 
      }, { status: 404 });
    }

    console.log('Found fee config:', feeConfig.name);

    const feeCalculation = feeConfig.calculateFee(articleType, authorCountry, institutionName);

    console.log('Fee calculation result:', feeCalculation);

    return NextResponse.json({ feeCalculation });

  } catch (error) {
    console.error('Error calculating fee:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate fee. Please try again or contact support.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
