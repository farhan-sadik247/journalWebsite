/**
 * Script to check and fix PaymentInfo data integrity issues
 * This script identifies PaymentInfo records that reference non-existent manuscripts or users
 */

import dbConnect from '@/lib/mongodb';
import PaymentInfo from '@/models/PaymentInfo';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';

async function checkPaymentInfoIntegrity() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Get all payment info records
    const paymentInfos = await PaymentInfo.find({}).lean();
    console.log(`Found ${paymentInfos.length} payment info records`);

    let orphanedManuscripts = 0;
    let orphanedUsers = 0;
    const orphanedRecords = [];

    for (const paymentInfo of paymentInfos) {
      let hasIssues = false;
      const issues = [];

      // Check if manuscript exists
      if (paymentInfo.manuscriptId) {
        const manuscript = await Manuscript.findById(paymentInfo.manuscriptId);
        if (!manuscript) {
          orphanedManuscripts++;
          hasIssues = true;
          issues.push('Missing manuscript');
        }
      }

      // Check if user exists
      if (paymentInfo.userId) {
        const user = await User.findById(paymentInfo.userId);
        if (!user) {
          orphanedUsers++;
          hasIssues = true;
          issues.push('Missing user');
        }
      }

      if (hasIssues) {
        orphanedRecords.push({
          _id: paymentInfo._id,
          manuscriptId: paymentInfo.manuscriptId,
          userId: paymentInfo.userId,
          status: paymentInfo.status,
          issues: issues
        });
      }
    }

    console.log('\n=== PaymentInfo Integrity Check Results ===');
    console.log(`Total records: ${paymentInfos.length}`);
    console.log(`Records with missing manuscripts: ${orphanedManuscripts}`);
    console.log(`Records with missing users: ${orphanedUsers}`);
    console.log(`Total problematic records: ${orphanedRecords.length}`);

    if (orphanedRecords.length > 0) {
      console.log('\nProblematic records:');
      orphanedRecords.forEach(record => {
        console.log(`- PaymentInfo ${record._id}: ${record.issues.join(', ')}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  ManuscriptId: ${record.manuscriptId}`);
        console.log(`  UserId: ${record.userId}`);
        console.log('');
      });
    } else {
      console.log('\n✅ All payment info records are valid!');
    }

  } catch (error) {
    console.error('Error checking payment info integrity:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
if (require.main === module) {
  checkPaymentInfoIntegrity();
}

export { checkPaymentInfoIntegrity };
