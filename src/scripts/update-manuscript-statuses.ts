/**
 * Manual Status Update Script
 * 
 * This script can be used to update the status of existing manuscripts
 * that have completed reviews but haven't had their status automatically updated.
 * 
 * Run this script when you need to sync existing data with the new workflow.
 */

import dbConnect from '../lib/mongodb';
import Manuscript from '../models/Manuscript';
import Review from '../models/Review';

// Helper function from review route
function determineManuscriptStatus(completedReviews: any[]): string {
  const recommendations = completedReviews.map(review => review.recommendation);
  
  // Count recommendations
  const acceptCount = recommendations.filter(r => r === 'accept').length;
  const rejectCount = recommendations.filter(r => r === 'reject').length;
  const majorRevisionCount = recommendations.filter(r => r === 'major-revision').length;
  const minorRevisionCount = recommendations.filter(r => r === 'minor-revision').length;
  
  // Decision logic based on reviewer recommendations
  if (acceptCount >= Math.ceil(completedReviews.length / 2)) {
    return 'accepted';
  } else if (rejectCount >= Math.ceil(completedReviews.length / 2)) {
    return 'rejected';
  } else if (majorRevisionCount > 0) {
    return 'major-revision-requested';
  } else if (minorRevisionCount > 0) {
    return 'minor-revision-requested';
  } else {
    return 'under-editorial-review';
  }
}

export async function updateManuscriptStatuses() {
  try {
    await dbConnect();
    
    console.log('Starting manuscript status update...');
    
    // Find manuscripts that are under-review or reviewed
    const manuscriptsToUpdate = await Manuscript.find({
      status: { $in: ['under-review', 'reviewed'] }
    });
    
    console.log(`Found ${manuscriptsToUpdate.length} manuscripts to check`);
    
    for (const manuscript of manuscriptsToUpdate) {
      // Get completed reviews for this manuscript
      const completedReviews = await Review.find({
        manuscriptId: manuscript._id,
        status: 'completed'
      });
      
      if (completedReviews.length >= 2) {
        const newStatus = determineManuscriptStatus(completedReviews);
        
        if (newStatus !== manuscript.status) {
          console.log(`Updating manuscript ${manuscript._id}: ${manuscript.status} → ${newStatus}`);
          
          await Manuscript.findByIdAndUpdate(manuscript._id, {
            status: newStatus,
            $push: {
              timeline: {
                event: 'status-update',
                description: `Status updated to ${newStatus} based on completed reviews`,
                performedBy: null, // System update
                metadata: {
                  previousStatus: manuscript.status,
                  newStatus: newStatus,
                  reviewCount: completedReviews.length,
                  recommendations: completedReviews.map((r: any) => r.recommendation)
                }
              }
            }
          });
        }
      }
    }
    
    console.log('Manuscript status update completed');
    
  } catch (error) {
    console.error('Error updating manuscript statuses:', error);
    throw error;
  }
}

// Export for use in API routes or scripts
export default updateManuscriptStatuses;
