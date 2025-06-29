/**
 * Test script to simulate review completion and verify status updates
 * This script demonstrates the fix for single review status updates
 */

import dbConnect from '../lib/mongodb';
import Manuscript from '../models/Manuscript';
import Review from '../models/Review';

async function testStatusUpdate() {
  try {
    await dbConnect();
    
    const manuscriptId = '68618556d8b17b6c653831ec';
    const reviewId = '686187e834add8d4d88e5ae7';
    
    console.log('=== Testing Single Review Status Update ===');
    
    // Get current manuscript status
    const manuscript = await Manuscript.findById(manuscriptId);
    console.log('Current manuscript status:', manuscript.status);
    
    // Get completed reviews
    const completedReviews = await Review.find({ 
      manuscriptId: manuscriptId, 
      status: 'completed' 
    });
    
    console.log('Completed reviews:', completedReviews.length);
    completedReviews.forEach((review, index) => {
      console.log(`Review ${index + 1}:`, {
        id: review._id,
        recommendation: review.recommendation,
        status: review.status
      });
    });
    
    // Simulate the new logic
    if (completedReviews.length >= 1) {
      let newStatus = manuscript.status;
      
      if (completedReviews.length >= 2) {
        // Use majority rule for 2+ reviews
        const acceptCount = completedReviews.filter(r => r.recommendation === 'accept').length;
        const rejectCount = completedReviews.filter(r => r.recommendation === 'reject').length;
        const majorRevisionCount = completedReviews.filter(r => r.recommendation === 'major-revision').length;
        const minorRevisionCount = completedReviews.filter(r => r.recommendation === 'minor-revision').length;
        
        if (acceptCount >= Math.ceil(completedReviews.length / 2)) {
          newStatus = 'accepted';
        } else if (rejectCount >= Math.ceil(completedReviews.length / 2)) {
          newStatus = 'rejected';
        } else if (majorRevisionCount > 0) {
          newStatus = 'major-revision-requested';
        } else if (minorRevisionCount > 0) {
          newStatus = 'minor-revision-requested';
        } else {
          newStatus = 'under-editorial-review';
        }
      } else if (completedReviews.length === 1) {
        // Handle single review cases
        const singleRecommendation = completedReviews[0].recommendation;
        console.log('Single review recommendation:', singleRecommendation);
        
        if (singleRecommendation === 'accept') {
          newStatus = 'accepted';
        } else if (singleRecommendation === 'reject') {
          newStatus = 'rejected';
        } else if (singleRecommendation === 'major-revision') {
          newStatus = 'major-revision-requested';
        } else if (singleRecommendation === 'minor-revision') {
          newStatus = 'minor-revision-requested';
        }
      }
      
      console.log('Calculated new status:', newStatus);
      console.log('Should update status:', newStatus !== manuscript.status);
      
      if (newStatus !== manuscript.status) {
        console.log('STATUS UPDATE WOULD TRIGGER!');
        console.log(`${manuscript.status} → ${newStatus}`);
        
        // For demo purposes, let's actually update it
        manuscript.status = newStatus;
        manuscript.timeline.push({
          event: 'status-update-test',
          description: `Status updated from ${manuscript.status} to ${newStatus} (test script)`,
          performedBy: null,
          metadata: {
            previousStatus: manuscript.status,
            newStatus: newStatus,
            reviewCount: completedReviews.length,
            recommendations: completedReviews.map(r => r.recommendation),
            triggeredBy: 'test-script'
          }
        });
        
        await manuscript.save();
        console.log('✅ Status updated successfully!');
      } else {
        console.log('ℹ️  Status is already correct');
      }
    }
    
    // Final verification
    const updatedManuscript = await Manuscript.findById(manuscriptId);
    console.log('Final manuscript status:', updatedManuscript.status);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export for potential use
export { testStatusUpdate };

// Run if called directly
if (require.main === module) {
  testStatusUpdate().then(() => {
    console.log('Test completed');
    process.exit(0);
  });
}
