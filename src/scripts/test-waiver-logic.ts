import dbConnect from '@/lib/mongodb';
import FeeConfig from '@/models/FeeConfig';
import User from '@/models/User';

async function testWaiverLogic() {
  console.log('🧪 Testing waiver logic...');
  
  try {
    await dbConnect();
    
    // Get or create default fee config
    const feeConfig = await FeeConfig.getDefaultConfig();
    console.log('Fee config loaded:', feeConfig.name);
    
    // Test cases for different countries
    const testCases = [
      { country: 'BD', expected: 'waiver', description: 'Bangladesh - should get 100% waiver' },
      { country: 'AF', expected: 'waiver', description: 'Afghanistan - should get 100% waiver' },
      { country: 'ET', expected: 'waiver', description: 'Ethiopia - should get 100% waiver' },
      { country: 'IN', expected: 'discount', description: 'India - should get 50% discount' },
      { country: 'US', expected: 'full_fee', description: 'United States - should pay full fee' },
      { country: 'GB', expected: 'full_fee', description: 'United Kingdom - should pay full fee' },
    ];
    
    console.log('\n📊 Testing fee calculations:');
    console.log('================================');
    
    for (const testCase of testCases) {
      const calculation = feeConfig.calculateFee('research', testCase.country, 'Test University');
      
      let result = '';
      if (calculation.isWaiver) {
        result = 'WAIVER (100%)';
      } else if (calculation.discountAmount > 0) {
        const discountPercent = Math.round((calculation.discountAmount / calculation.baseFee) * 100);
        result = `DISCOUNT (${discountPercent}%)`;
      } else {
        result = 'FULL FEE';
      }
      
      console.log(`${testCase.country}: ${result}`);
      console.log(`  - Base Fee: $${calculation.baseFee}`);
      console.log(`  - Final Fee: $${calculation.finalFee}`);
      console.log(`  - Discount: $${calculation.discountAmount}`);
      console.log(`  - Reason: ${calculation.discountReason || 'None'}`);
      console.log(`  - Expected: ${testCase.description}`);
      console.log('');
    }
    
    // Test with a specific user from Bangladesh
    console.log('👤 Testing with actual user data:');
    console.log('==================================');
    
    // Create a test user from Bangladesh
    const testUser = await User.findOneAndUpdate(
      { email: 'test.bangladesh@journal.com' },
      {
        name: 'Test User Bangladesh',
        email: 'test.bangladesh@journal.com',
        country: 'BD',
        affiliation: 'University of Dhaka',
        role: 'author',
        roles: ['author'],
        currentActiveRole: 'author'
      },
      { upsert: true, new: true }
    );
    
    console.log(`Created/updated test user: ${testUser.name} (${testUser.country})`);
    
    // Test fee calculation for this user
    const userCalculation = feeConfig.calculateFee('research', testUser.country, testUser.affiliation);
    
    console.log('Fee calculation for Bangladesh user:');
    console.log(`  - Country: ${testUser.country}`);
    console.log(`  - Institution: ${testUser.affiliation}`);
    console.log(`  - Base Fee: $${userCalculation.baseFee}`);
    console.log(`  - Final Fee: $${userCalculation.finalFee}`);
    console.log(`  - Is Waiver: ${userCalculation.isWaiver}`);
    console.log(`  - Discount Amount: $${userCalculation.discountAmount}`);
    console.log(`  - Reason: ${userCalculation.discountReason}`);
    
    if (userCalculation.isWaiver && userCalculation.finalFee === 0) {
      console.log('✅ SUCCESS: Bangladesh user gets full waiver as expected!');
    } else {
      console.log('❌ ERROR: Bangladesh user should get full waiver but doesn\'t!');
    }
    
    console.log('\n🔍 Fee config details:');
    console.log('=======================');
    console.log('Country discounts:');
    feeConfig.countryDiscounts.forEach((discount: any) => {
      console.log(`  ${discount.country}: ${discount.discountType} ${discount.discountValue}% - ${discount.description}`);
    });
    
    console.log('\nAutomatic waiver countries:');
    feeConfig.automaticWaiverCountries.forEach((country: string) => {
      console.log(`  ${country}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing waiver logic:', error);
  }
}

// Run the test
testWaiverLogic()
  .then(() => {
    console.log('\n🎉 Waiver logic test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
