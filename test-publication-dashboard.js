// Test script to verify the publication dashboard functionality
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testPublicationDashboard() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable not found');
    console.log('Make sure .env.local exists with MONGODB_URI');
    return;
  }
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('=== Testing Publication Dashboard Data ===');
    
    // Find manuscripts ready for publication
    const readyManuscripts = await db.collection('manuscripts').find({
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved'
    }).toArray();
    
    console.log(`Found ${readyManuscripts.length} manuscripts ready for publication:`);
    
    readyManuscripts.forEach((manuscript, index) => {
      console.log(`\n${index + 1}. ${manuscript.title}`);
      console.log(`   Status: ${manuscript.status}`);
      console.log(`   Copy Edit Stage: ${manuscript.copyEditingStage}`);
      console.log(`   Authors: ${manuscript.authors?.map(a => a.name).join(', ')}`);
      console.log(`   Latest Files: ${manuscript.latestManuscriptFiles?.length || 0} files`);
      
      if (manuscript.authorCopyEditReview) {
        console.log(`   Author Review: ${manuscript.authorCopyEditReview.decision} on ${new Date(manuscript.authorCopyEditReview.submittedAt).toLocaleDateString()}`);
      }
      
      if (manuscript.latestManuscriptFiles?.length > 0) {
        console.log(`   Files for publication:`);
        manuscript.latestManuscriptFiles.forEach((file, fileIndex) => {
          console.log(`     - ${file.originalName} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        });
      }
    });
    
    console.log('\n=== Dashboard Statistics ===');
    const allManuscripts = await db.collection('manuscripts').find({}).toArray();
    const stats = {
      total: allManuscripts.length,
      readyForPublication: readyManuscripts.length,
      published: allManuscripts.filter(m => m.status === 'published').length,
      inProduction: allManuscripts.filter(m => m.status === 'in-production').length
    };
    
    console.log('Total manuscripts:', stats.total);
    console.log('Ready for publication:', stats.readyForPublication);
    console.log('Published:', stats.published);
    console.log('In production:', stats.inProduction);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error testing publication dashboard:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  testPublicationDashboard();
}

module.exports = { testPublicationDashboard };
