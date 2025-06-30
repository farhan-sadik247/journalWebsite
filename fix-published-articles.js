const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function addVolumeIssueToPublished() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const manuscripts = db.collection('manuscripts');
    
    // Find the published manuscript
    const published = await manuscripts.findOne({ status: 'published' });
    
    if (published) {
      // Update it with volume and issue info
      const result = await manuscripts.updateOne(
        { _id: published._id },
        { 
          $set: { 
            volume: 1,
            issue: 1,
            pages: '1-15',
            doi: '10.1234/journal.2025.001'
          }
        }
      );
      
      console.log('✅ Updated published manuscript:', published.title);
      console.log('Added volume: 1, issue: 1, pages: 1-15');
      console.log('Update result:', result);
    } else {
      console.log('❌ No published manuscript found');
    }
    
    // Also publish one of our ready manuscripts to test
    const readyManuscript = await manuscripts.findOne({ 
      status: 'ready-for-publication', 
      copyEditingStage: 'author-approved' 
    });
    
    if (readyManuscript) {
      const publishResult = await manuscripts.updateOne(
        { _id: readyManuscript._id },
        { 
          $set: { 
            status: 'published',
            publishedDate: new Date(),
            volume: 1,
            issue: 2,
            pages: '16-30',
            doi: '10.1234/journal.2025.002'
          }
        }
      );
      
      console.log('✅ Published manuscript:', readyManuscript.title);
      console.log('Added volume: 1, issue: 2, pages: 16-30');
      console.log('Publish result:', publishResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

addVolumeIssueToPublished();
