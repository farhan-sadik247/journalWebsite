import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';

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

// GET /api/fee-config/public - Get fee configuration (public access)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const config = await FeeConfig.getDefaultConfig();
    
    if (!config) {
      // Return a default configuration if none exists
      return NextResponse.json({ 
        config: {
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
            { articleType: 'short-report', fee: 800 }
          ],
          paymentDeadlineDays: 30,
          supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer'],
          requirePaymentBeforeProduction: true
        }
      });
    }
    
    // Sanitize the config before returning (remove any 'waiver' methods)
    const sanitizedConfig = sanitizeFeeConfigData(config.toObject());

    return NextResponse.json({ config: sanitizedConfig });

  } catch (error) {
    console.error('Error fetching public fee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
