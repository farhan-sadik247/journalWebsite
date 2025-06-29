import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';

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

// POST /api/fee-config/calculate - Calculate fee for manuscript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleType, authorCountry, institutionName } = await request.json();

    if (!articleType || !authorCountry) {
      return NextResponse.json({
        error: 'Article type and author country are required'
      }, { status: 400 });
    }

    await dbConnect();

    const feeConfig = await FeeConfig.getDefaultConfig();
    const feeCalculation = feeConfig.calculateFee(articleType, authorCountry, institutionName);

    return NextResponse.json({ feeCalculation });

  } catch (error) {
    console.error('Error calculating fee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
