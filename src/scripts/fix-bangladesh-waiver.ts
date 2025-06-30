import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';

async function fixBangladeshWaiver() {
  console.log('🔧 Fixing Bangladesh waiver configuration...');
  
  try {
    await dbConnect();
    
    // Find the default fee config
    const feeConfig = await FeeConfig.findOne({ name: 'default' });
    
    if (!feeConfig) {
      console.error('❌ Default fee config not found');
      return;
    }
    
    console.log('📋 Current configuration:');
    console.log('AutomaticWaiverCountries:', feeConfig.automaticWaiverCountries);
    
    // Check Bangladesh discount in countryDiscounts
    const bdDiscount = feeConfig.countryDiscounts.find((cd: any) => cd.country === 'BD');
    console.log('Bangladesh countryDiscount:', bdDiscount);
    
    // Remove Bangladesh from automaticWaiverCountries since it should only get 90% discount
    const updatedWaiverCountries = feeConfig.automaticWaiverCountries.filter((country: string) => country !== 'BD');
    
    console.log('🔄 Updating automaticWaiverCountries...');
    console.log('Before:', feeConfig.automaticWaiverCountries);
    console.log('After:', updatedWaiverCountries);
    
    // Update the fee config
    const result = await FeeConfig.findByIdAndUpdate(
      feeConfig._id,
      { 
        automaticWaiverCountries: updatedWaiverCountries,
        lastModifiedBy: feeConfig.createdBy // Use same user as modifier
      },
      { new: true }
    );
    
    if (result) {
      console.log('✅ Successfully updated fee configuration');
      console.log('Updated automaticWaiverCountries:', result.automaticWaiverCountries);
      
      // Test the calculation for Bangladesh
      console.log('\n🧪 Testing Bangladesh fee calculation...');
      const calculation = result.calculateFee('research', 'BD', 'Test University');
      console.log('Bangladesh calculation result:', calculation);
      
      if (calculation.discountAmount && !calculation.isWaiver) {
        const discountPercent = Math.round((calculation.discountAmount / calculation.baseFee) * 100);
        console.log(`✅ SUCCESS: Bangladesh now gets ${discountPercent}% discount instead of full waiver`);
      } else {
        console.log('❌ ERROR: Bangladesh is still getting full waiver instead of 90% discount');
      }
    } else {
      console.error('❌ Failed to update fee configuration');
    }
    
  } catch (error) {
    console.error('❌ Error fixing Bangladesh waiver:', error);
  }
}

// Run the fix
fixBangladeshWaiver()
  .then(() => {
    console.log('\n🎉 Bangladesh waiver fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
