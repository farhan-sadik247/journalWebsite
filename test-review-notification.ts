// Test script to verify the author review notification functionality
// Run this with: node -r ts-node/register test-review-notification.ts

import { notifyAuthorReviewSubmitted } from './src/lib/notificationUtils';

async function testReviewNotification() {
  try {
    console.log('Testing author review notification...');
    
    const result = await notifyAuthorReviewSubmitted(
      'test-author@example.com',
      '507f1f77bcf86cd799439011', // Test manuscript ID
      'Test Manuscript Title',
      'Dr. Test Reviewer'
    );
    
    if (result) {
      console.log('✅ Notification created successfully:', result._id);
    } else {
      console.log('⚠️ Notification creation returned null (user might not exist)');
    }
  } catch (error) {
    console.error('❌ Error testing notification:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testReviewNotification();
}

export { testReviewNotification };
