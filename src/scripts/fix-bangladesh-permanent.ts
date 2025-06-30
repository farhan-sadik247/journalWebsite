import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import FeeConfig from '../models/FeeConfig';

async function fixBangladeshWaiverLogic() {
  console.log('🔧 Starting Bangladesh Waiver Logic Fix...');
  
  try {
    await dbConnect();
    console.log('✅ Connected to database');

    // Get the current default fee configuration
    const feeConfig = await FeeConfig.findOne({ name: 'default', isActive: true });
    
    if (!feeConfig) {
      console.log('❌ No default fee configuration found!');
      return;
    }

    console.log('📋 Current configuration:');
    console.log(`- Automatic Waiver Countries: ${JSON.stringify(feeConfig.automaticWaiverCountries)}`);
    console.log(`- Country Discounts: ${JSON.stringify(feeConfig.countryDiscounts.map((cd: any) => ({ country: cd.country, type: cd.discountType, value: cd.discountValue })))}`);

    let hasChanges = false;

    // 1. Remove Bangladesh from automaticWaiverCountries if it exists
    if (feeConfig.automaticWaiverCountries.includes('BD')) {
      feeConfig.automaticWaiverCountries = feeConfig.automaticWaiverCountries.filter((country: any) => country !== 'BD');
      hasChanges = true;
      console.log('✅ Removed Bangladesh (BD) from automaticWaiverCountries');
    } else {
      console.log('✅ Bangladesh (BD) is already NOT in automaticWaiverCountries');
    }

    // 2. Ensure Bangladesh has the correct 90% discount in countryDiscounts
    const bangladeshDiscountIndex = feeConfig.countryDiscounts.findIndex((cd: any) => cd.country === 'BD');
    
    if (bangladeshDiscountIndex >= 0) {
      const currentDiscount = feeConfig.countryDiscounts[bangladeshDiscountIndex];
      console.log(`📝 Current Bangladesh discount: ${JSON.stringify(currentDiscount)}`);
      
      // Update to ensure it's a 90% percentage discount
      if (currentDiscount.discountType !== 'percentage' || currentDiscount.discountValue !== 90) {
        feeConfig.countryDiscounts[bangladeshDiscountIndex] = {
          ...currentDiscount,
          discountType: 'percentage',
          discountValue: 90,
          description: 'Low-income country 90% discount'
        };
        hasChanges = true;
        console.log('✅ Updated Bangladesh to 90% percentage discount');
      } else {
        console.log('✅ Bangladesh already has correct 90% percentage discount');
      }
    } else {
      // Add Bangladesh with 90% discount if it doesn't exist
      feeConfig.countryDiscounts.push({
        country: 'BD',
        discountType: 'percentage',
        discountValue: 90,
        description: 'Low-income country 90% discount'
      });
      hasChanges = true;
      console.log('✅ Added Bangladesh with 90% percentage discount');
    }

    // Save changes if any were made
    if (hasChanges) {
      await feeConfig.save();
      console.log('💾 Configuration saved successfully!');
    } else {
      console.log('✅ No changes needed - configuration is already correct');
    }

    // 3. Test the fee calculation
    console.log('\n🧪 Testing fee calculation for Bangladesh...');
    const testResult = feeConfig.calculateFee('research', 'BD');
    console.log(`Test Result:`, testResult);

    // Verify the result is correct
    const expectedFinalFee = feeConfig.baseFee * 0.1; // 10% of base fee (90% discount)
    const isCorrect = testResult.finalFee === expectedFinalFee && !testResult.isWaiver;

    console.log(`\n📊 Verification:`);
    console.log(`- Base Fee: $${feeConfig.baseFee}`);
    console.log(`- Expected Final Fee: $${expectedFinalFee} (90% discount)`);
    console.log(`- Actual Final Fee: $${testResult.finalFee}`);
    console.log(`- Is Waiver: ${testResult.isWaiver}`);
    console.log(`- Discount Reason: ${testResult.discountReason}`);
    console.log(`- Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

    if (!isCorrect) {
      console.log('❌ WARNING: Fee calculation is still incorrect!');
      console.log('Please check the calculateFee method in FeeConfig model.');
    }

    // 4. Final configuration summary
    console.log('\n📋 Final Configuration Summary:');
    console.log(`- Automatic Waiver Countries: ${JSON.stringify(feeConfig.automaticWaiverCountries)}`);
    console.log('- Bangladesh Status:');
    console.log(`  - In Automatic Waivers: ${feeConfig.automaticWaiverCountries.includes('BD') ? 'YES (PROBLEM!)' : 'NO (Good)'}`);
    console.log(`  - Has Discount: ${feeConfig.countryDiscounts.some((cd: any) => cd.country === 'BD') ? 'YES' : 'NO'}`);
    
    const bdDiscount = feeConfig.countryDiscounts.find((cd: any) => cd.country === 'BD');
    if (bdDiscount) {
      console.log(`  - Discount Type: ${bdDiscount.discountType}`);
      console.log(`  - Discount Value: ${bdDiscount.discountValue}${bdDiscount.discountType === 'percentage' ? '%' : ''}`);
    }

    console.log('\n🎉 Bangladesh waiver logic fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing Bangladesh waiver logic:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔐 Database connection closed');
  }
}

// Run the fix
if (require.main === module) {
  fixBangladeshWaiverLogic()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

export default fixBangladeshWaiverLogic;
