import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// POST /api/fee-config/reset - Reset to default configuration (admin only)
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

    // Delete existing default config
    await FeeConfig.deleteOne({ name: 'default' });

    // Create new default config
    const defaultConfig = new FeeConfig({
      name: 'default',
      description: 'Fixed APC fee structure based on article categories',
      baseFee: 2000,
      currency: 'USD',
      articleTypeFees: [
        { articleType: 'research', fee: 2000 },
        { articleType: 'review', fee: 1500 },
        { articleType: 'meta-analysis', fee: 1800 },
        { articleType: 'systematic-review', fee: 1600 },
        { articleType: 'case-study', fee: 1200 },
        { articleType: 'commentary', fee: 800 },
        { articleType: 'editorial', fee: 500 },
        { articleType: 'letter', fee: 400 },
        { articleType: 'opinion', fee: 600 },
        { articleType: 'perspective', fee: 700 },
        { articleType: 'brief-communication', fee: 500 },
        { articleType: 'methodology', fee: 1400 },
        { articleType: 'technical-note', fee: 900 },
        { articleType: 'short-report', fee: 800 },
      ],
      paymentDeadlineDays: 30,
      isActive: true,
      requirePaymentBeforeProduction: true,
      supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer'],
      createdBy: user._id,
      lastModifiedBy: user._id
    });

    await defaultConfig.save();

    return NextResponse.json({ 
      message: 'Configuration reset to defaults successfully',
      config: defaultConfig
    });

  } catch (error) {
    console.error('Error resetting fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
