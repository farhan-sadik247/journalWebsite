import dbConnect from '@/lib/mongodb';
import { notifyManuscriptAcceptedWithFee } from '@/lib/notificationUtils';
import Notification from '@/models/Notification';

async function testAcceptanceNotifications() {
  try {
    await dbConnect();
    
    console.log('Testing acceptance notifications...');
    
    // Test data for a typical manuscript acceptance
    const testData = {
      authorEmail: 'test.author@university.edu', // Replace with actual test email
      manuscriptId: '507f1f77bcf86cd799439011', // Mock manuscript ID
      manuscriptTitle: 'Test Manuscript: Advanced Research in Test Domain',
      manuscriptData: {
        articleType: 'research',
        authorCountry: 'US',
        institutionName: 'Test University'
      }
    };
    
    // Clear any existing test notifications for this email
    await Notification.deleteMany({ 
      recipient: { $exists: true },
      'metadata.createdBy': 'editorial_system',
      title: { $regex: /Test Manuscript/ }
    });
    
    console.log('Sending acceptance notifications...');
    
    // Call the notification function
    const result = await notifyManuscriptAcceptedWithFee(
      testData.authorEmail,
      testData.manuscriptId,
      testData.manuscriptTitle,
      testData.manuscriptData
    );
    
    console.log('Notification result:', {
      acceptanceNotification: result.acceptanceNotification ? 'Created' : 'Failed',
      paymentNotification: result.paymentNotification ? 'Created' : 'Failed',
      feeCalculation: {
        finalFee: result.feeCalculation?.finalFee,
        isWaiver: result.feeCalculation?.isWaiver,
        currency: result.feeCalculation?.currency
      }
    });
    
    // Query notifications to verify they were created
    const notifications = await Notification.find({
      'metadata.createdBy': 'editorial_system',
      title: { $regex: /Test Manuscript|Article Processing Charge/ }
    }).sort({ createdAt: -1 }).limit(5);
    
    console.log(`\nFound ${notifications.length} test notifications:`);
    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. Type: ${notification.type}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message.substring(0, 100)}...`);
      console.log(`   Priority: ${notification.priority}`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log('');
    });
    
    // Clean up test notifications
    await Notification.deleteMany({ 
      title: { $regex: /Test Manuscript/ }
    });
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAcceptanceNotifications().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default testAcceptanceNotifications;
