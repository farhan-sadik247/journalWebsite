import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// POST /api/fee-config/cleanup - Clean up old waiver payment methods (admin only)
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

    console.log('🧹 Cleaning up old waiver payment methods...');

    // Find all fee configs
    const configs = await FeeConfig.find({});
    
    const updates = [];
    
    for (const config of configs) {
      if (config.supportedPaymentMethods && config.supportedPaymentMethods.includes('waiver')) {
        console.log(`Removing waiver from config: ${config.name}`);
        
        // Remove 'waiver' from the array
        const cleanedMethods = config.supportedPaymentMethods.filter((method: string) => method !== 'waiver');
        
        // Ensure we have the basic payment methods
        const requiredMethods = ['stripe', 'paypal', 'bank_transfer'];
        for (const method of requiredMethods) {
          if (!cleanedMethods.includes(method)) {
            cleanedMethods.push(method);
          }
        }
        
        // Update the config
        await FeeConfig.findByIdAndUpdate(config._id, {
          supportedPaymentMethods: cleanedMethods,
          lastModifiedBy: user._id
        });
        
        updates.push({
          configName: config.name,
          oldMethods: config.supportedPaymentMethods,
          newMethods: cleanedMethods
        });
      }
    }

    console.log(`✅ Cleanup completed. Updated ${updates.length} configurations.`);

    return NextResponse.json({ 
      message: 'Cleanup completed successfully',
      updatedConfigs: updates.length,
      updates: updates
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
