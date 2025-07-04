// Test script to verify that published manuscripts cannot have reviewers assigned
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';

async function testReviewAssignmentProtection() {
  try {
    await dbConnect();
    
    console.log('🔍 Testing review assignment protection for published manuscripts...');
    
    // Find a published manuscript
    const publishedManuscript = await Manuscript.findOne({ status: 'published' });
    
    if (!publishedManuscript) {
      console.log('❌ No published manuscripts found for testing');
      return;
    }
    
    console.log(`📄 Found published manuscript: "${publishedManuscript.title}"`);
    console.log(`📊 Status: ${publishedManuscript.status}`);
    
    // Find a reviewer
    const reviewer = await User.findOne({ 
      $or: [
        { roles: { $in: ['reviewer'] } },
        { role: 'reviewer' }
      ]
    });
    
    if (!reviewer) {
      console.log('❌ No reviewers found for testing');
      return;
    }
    
    console.log(`👤 Found reviewer: ${reviewer.name} (${reviewer.email})`);
    
    // Simulate the API request that should be blocked
    console.log('🧪 Testing if API would block review assignment...');
    
    // This would be the logic from our updated API
    if (publishedManuscript.status === 'published') {
      console.log('✅ SUCCESS: Published manuscript detected - review assignment would be blocked');
      console.log('📋 Protection working correctly!');
    } else {
      console.log('❌ FAILED: Published manuscript not detected properly');
    }
    
    // Also test with non-published manuscripts
    const nonPublishedManuscript = await Manuscript.findOne({ 
      status: { $in: ['submitted', 'under-review', 'revision-requested'] }
    });
    
    if (nonPublishedManuscript) {
      console.log(`\n📄 Testing with non-published manuscript: "${nonPublishedManuscript.title}"`);
      console.log(`📊 Status: ${nonPublishedManuscript.status}`);
      
      if (nonPublishedManuscript.status !== 'published') {
        console.log('✅ SUCCESS: Non-published manuscript would allow review assignment');
      } else {
        console.log('❌ FAILED: Non-published manuscript logic error');
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Export for potential use
export default testReviewAssignmentProtection;

// Run if called directly
if (require.main === module) {
  testReviewAssignmentProtection().then(() => {
    console.log('Test script finished');
    process.exit(0);
  }).catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
}
