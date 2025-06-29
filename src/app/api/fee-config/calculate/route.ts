import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

// PUT /api/fee-config/calculate - Calculate fee for manuscript
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleType, authorCountry, institutionName } = await request.json();

    console.log('Fee calculation request:', { articleType, authorCountry, institutionName, userId: session.user.id });

    await dbConnect();

    // Get user's country from database if not provided
    let userCountry = authorCountry;
    let userInstitution = institutionName;
    
    if (!userCountry || !userInstitution) {
      const user = await User.findById(session.user.id);
      if (user) {
        userCountry = userCountry || user.country || 'US'; // Default to US if no country set
        userInstitution = userInstitution || user.affiliation || '';
        console.log('Retrieved user data:', { 
          country: user.country, 
          affiliation: user.affiliation,
          finalCountry: userCountry,
          finalInstitution: userInstitution 
        });
      }
    }

    if (!articleType) {
      return NextResponse.json({
        error: 'Article type is required'
      }, { status: 400 });
    }

    const feeConfig = await FeeConfig.getDefaultConfig();
    
    if (!feeConfig) {
      console.error('No default fee configuration found');
      return NextResponse.json({ 
        error: 'Fee configuration not available. Please contact administrator.' 
      }, { status: 404 });
    }

    console.log('Found fee config:', feeConfig.name);

    const feeCalculation = feeConfig.calculateFee(articleType, userCountry, userInstitution);

    console.log('Raw fee calculation result:', feeCalculation);

    // Transform the result to match frontend expectations
    const transformedResult = {
      baseFee: feeCalculation.baseFee,
      originalAmount: feeCalculation.baseFee,
      finalAmount: feeCalculation.finalFee,
      discountAmount: feeCalculation.discountAmount,
      discountApplied: feeCalculation.discountAmount > 0,
      discountReason: feeCalculation.discountReason,
      isWaiver: feeCalculation.isWaiver,
      waiverReason: feeCalculation.isWaiver ? feeCalculation.discountReason : null,
      currency: feeConfig.currency,
      paymentDeadlineDays: feeConfig.paymentDeadlineDays,
      articleType: articleType,
      userCountry: userCountry,
      userInstitution: userInstitution
    };

    console.log('Transformed fee calculation result:', transformedResult);

    return NextResponse.json({ feeCalculation: transformedResult });

  } catch (error) {
    console.error('Error calculating fee:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate fee. Please try again or contact support.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST method
export async function POST(request: NextRequest) {
  return PUT(request);
}
