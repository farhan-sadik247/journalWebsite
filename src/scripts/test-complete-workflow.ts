import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import Notification from '@/models/Notification';

async function testCompleteAcceptanceWorkflow() {
  try {
    await dbConnect();
    
    console.log('Testing complete acceptance workflow...');
    
    // Find a test manuscript that has reviews
    const testManuscript = await Manuscript.findOne({
      status: { $in: ['under-review', 'reviewed'] }
    }).populate('authors');
    
    if (!testManuscript) {
      console.log('No suitable test manuscript found. Creating test scenario...');
      return;
    }
    
    console.log(`Found test manuscript: ${testManuscript.title}`);
    console.log(`Current status: ${testManuscript.status}`);
    
    // Find reviews for this manuscript
    const reviews = await Review.find({ manuscriptId: testManuscript._id });
    console.log(`Found ${reviews.length} reviews for this manuscript`);
    
    if (reviews.length === 0) {
      console.log('No reviews found for test manuscript');
      return;
    }
    
    // Check current notifications for the author
    const correspondingAuthor = testManuscript.authors.find((author: any) => author.isCorresponding);
    if (!correspondingAuthor) {
      console.log('No corresponding author found');
      return;
    }
    
    console.log(`Corresponding author: ${correspondingAuthor.email}`);
    
    // Count notifications before the test
    const notificationsBefore = await Notification.countDocuments({
      'metadata.createdBy': 'editorial_system',
      relatedManuscript: testManuscript._id
    });
    
    console.log(`Notifications before test: ${notificationsBefore}`);
    
    // Simulate acceptance by updating the first review to "accept"
    const firstReview = reviews[0];
    const originalRecommendation = firstReview.recommendation;
    const originalStatus = firstReview.status;
    
    console.log(`\nSimulating acceptance for review ${firstReview._id}`);
    console.log(`Original recommendation: ${originalRecommendation}`);
    console.log(`Original status: ${originalStatus}`);
    
    // Update the review to simulate acceptance
    firstReview.recommendation = 'accept';
    firstReview.status = 'completed';
    await firstReview.save();
    
    console.log('Review updated to "accept" and "completed"');
    
    // Now simulate the manuscript status update logic
    const allReviews = await Review.find({ manuscriptId: testManuscript._id });
    const completedReviews = allReviews.filter(r => r.status === 'completed');
    
    console.log(`Total reviews: ${allReviews.length}, Completed: ${completedReviews.length}`);
    
    if (completedReviews.length >= 1) {
      const acceptReviews = completedReviews.filter(r => r.recommendation === 'accept');
      console.log(`Accept recommendations: ${acceptReviews.length}`);
      
      if (acceptReviews.length > 0) {
        console.log('Manuscript should be updated to "accepted" status');
        
        // Check if this would trigger acceptance workflow
        if (testManuscript.status !== 'accepted') {
          console.log('Status would change to accepted - notifications should be sent');
        }
      }
    }
    
    // Wait a moment and check for new notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const notificationsAfter = await Notification.find({
      'metadata.createdBy': 'editorial_system',
      relatedManuscript: testManuscript._id
    }).sort({ createdAt: -1 }).limit(5);
    
    console.log(`\nNotifications after test: ${notificationsAfter.length}`);
    notificationsAfter.forEach((notification, index) => {
      console.log(`${index + 1}. Type: ${notification.type}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Created: ${notification.createdAt}`);
    });
    
    // Restore original review state
    firstReview.recommendation = originalRecommendation;
    firstReview.status = originalStatus;
    await firstReview.save();
    
    console.log('\nOriginal review state restored');
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCompleteAcceptanceWorkflow().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default testCompleteAcceptanceWorkflow;
