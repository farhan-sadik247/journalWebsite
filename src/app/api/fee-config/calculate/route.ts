import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';

// PUT /api/fee-config/calculate - Calculate fee for manuscript
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleType } = await request.json();

    console.log('Fee calculation request:', { articleType, userId: session.user.id });

    if (!articleType) {
      return NextResponse.json({
        error: 'Article type is required'
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

    // Calculate fee using only article type (no country/institution discounts)
    const feeCalculation = feeConfig.calculateFee(articleType);

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
