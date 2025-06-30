import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// Sanitize fee config data to remove 'waiver' payment methods
function sanitizeFeeConfigData(data: any) {
  if (data.supportedPaymentMethods) {
    data.supportedPaymentMethods = data.supportedPaymentMethods.filter((method: string) => method !== 'waiver');
    
    // Ensure we have at least the basic payment methods
    const requiredMethods = ['stripe', 'paypal', 'bank_transfer'];
    for (const method of requiredMethods) {
      if (!data.supportedPaymentMethods.includes(method)) {
        data.supportedPaymentMethods.push(method);
      }
    }
  }
  return data;
}

// GET /api/fee-config - Get fee configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const config = await FeeConfig.getDefaultConfig();
    
    // Sanitize the config before returning
    const sanitizedConfig = config ? sanitizeFeeConfigData(config.toObject()) : null;

    return NextResponse.json({ config: sanitizedConfig });

  } catch (error) {
    console.error('Error fetching fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/fee-config - Update fee configuration (admin only)
export async function PUT(request: NextRequest) {
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
    
    // Sanitize the data to remove any 'waiver' payment methods
    const sanitizedData = sanitizeFeeConfigData(feeConfigData);

    // Find or create default config
    let config = await FeeConfig.findOne({ name: 'default', isActive: true });

    if (config) {
      // Update existing config
      Object.assign(config, {
        ...sanitizedData,
        lastModifiedBy: user._id,
      });
      await config.save();
      
      return NextResponse.json({ 
        message: 'Fee configuration updated successfully',
        config
      });
    } else {
      // Create new config
      const newConfig = new FeeConfig({
        name: 'default',
        description: 'Fixed APC fee structure based on article categories',
        ...sanitizedData,
        createdBy: user._id,
        lastModifiedBy: user._id,
        isActive: true
      });
      
      await newConfig.save();
      
      return NextResponse.json({ 
        message: 'Fee configuration created successfully',
        config: newConfig
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error updating fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
