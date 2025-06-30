const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testPublicationQuery() {
  try {
    await connectDB();
    
    console.log('\n🔍 Testing publication dashboard query...');
    
    const db = mongoose.connection.db;
    const manuscripts = db.collection('manuscripts');
    
    // Test the exact query used in the API
    const publicationManuscripts = await manuscripts.find({
      $or: [
        { status: 'ready-for-publication' },
        { status: 'published' },
        { status: 'in-production' },
        { copyEditingStage: 'author-approved' },
        { status: 'copy-editing-complete' }
      ]
    })
    .project({
      _id: 1,
      title: 1,
      authors: 1,
      status: 1,
      copyEditingStage: 1,
      submissionDate: 1,
      lastModified: 1,
      publishedDate: 1,
      category: 1,
      doi: 1,
      volume: 1,
      issue: 1,
      pages: 1,
      latestManuscriptFiles: 1,
      authorCopyEditReview: 1
    })
    .sort({ lastModified: -1 })
    .toArray();
    
    console.log(`\n📊 Query Results: Found ${publicationManuscripts.length} manuscripts`);
    
    // Group by status and copy editing stage
    const byStatus = {};
    const byCopyEditingStage = {};
    
    publicationManuscripts.forEach(m => {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
      if (m.copyEditingStage) {
        byCopyEditingStage[m.copyEditingStage] = (byCopyEditingStage[m.copyEditingStage] || 0) + 1;
      }
    });
    
    console.log('\n📈 By Status:', byStatus);
    console.log('📈 By Copy Editing Stage:', byCopyEditingStage);
    
    console.log('\n📋 Manuscripts found:');
    publicationManuscripts.forEach((m, index) => {
      console.log(`${index + 1}. ${m.title}`);
      console.log(`   Status: ${m.status}`);
      console.log(`   Copy Editing Stage: ${m.copyEditingStage || 'None'}`);
      console.log(`   Category: ${m.category}`);
      console.log(`   Latest Files: ${m.latestManuscriptFiles?.length || 0} files`);
      console.log(`   Author Review: ${m.authorCopyEditReview?.approval || 'None'}`);
      console.log('');
    });
    
    // Test ready-for-publication filter specifically
    const readyManuscripts = publicationManuscripts.filter(m => 
      (m.status === 'ready-for-publication' || m.copyEditingStage === 'author-approved') && !m.publishedDate
    );
    
    console.log(`🎯 Ready to Publish (dashboard filter): ${readyManuscripts.length} manuscripts`);
    
    const publishedManuscripts = publicationManuscripts.filter(m => 
      m.status === 'published' && m.publishedDate
    );
    
    console.log(`📚 Published (dashboard filter): ${publishedManuscripts.length} manuscripts`);
    
    const inProductionManuscripts = publicationManuscripts.filter(m => 
      m.status === 'in-production'
    );
    
    console.log(`🔧 In Production (dashboard filter): ${inProductionManuscripts.length} manuscripts`);
    
  } catch (error) {
    console.error('❌ Error testing query:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testPublicationQuery();
