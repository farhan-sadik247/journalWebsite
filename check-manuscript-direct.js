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

// Define Manuscript schema (simplified)
const manuscriptSchema = new mongoose.Schema({
  title: String,
  status: String,
  copyEditingStage: String,
  submissionDate: Date,
  lastModified: Date,
  publishedDate: Date,
  latestManuscriptFiles: [{
    filename: String,
    uploadDate: Date,
    type: String
  }],
  authorCopyEditReview: {
    approved: Boolean,
    uploadedFiles: [{
      filename: String,
      uploadDate: Date,
      type: String
    }]
  }
}, { collection: 'manuscripts' });

const Manuscript = mongoose.model('Manuscript', manuscriptSchema);

async function checkManuscripts() {
  try {
    await connectDB();
    
    console.log('\n🔍 Checking all manuscripts...');
    
    // Get all manuscripts
    const allManuscripts = await Manuscript.find({}).select('title status copyEditingStage submissionDate publishedDate latestManuscriptFiles authorCopyEditReview').lean();
    
    console.log(`\n📊 Total manuscripts found: ${allManuscripts.length}`);
    
    // Group by status
    const byStatus = {};
    const byCopyEditingStage = {};
    
    allManuscripts.forEach(m => {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
      if (m.copyEditingStage) {
        byCopyEditingStage[m.copyEditingStage] = (byCopyEditingStage[m.copyEditingStage] || 0) + 1;
      }
    });
    
    console.log('\n📈 By Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n📈 By Copy Editing Stage:');
    Object.entries(byCopyEditingStage).forEach(([stage, count]) => {
      console.log(`  ${stage}: ${count}`);
    });
    
    // Find ready-for-publication manuscripts
    console.log('\n🎯 Ready for Publication manuscripts:');
    const readyForPublication = allManuscripts.filter(m => 
      m.status === 'ready-for-publication' && m.copyEditingStage === 'author-approved'
    );
    
    console.log(`Found ${readyForPublication.length} manuscripts ready for publication:`);
    readyForPublication.forEach(m => {
      console.log(`  - ${m.title}`);
      console.log(`    Status: ${m.status}`);
      console.log(`    Copy Editing Stage: ${m.copyEditingStage}`);
      console.log(`    Latest Files: ${m.latestManuscriptFiles?.length || 0} files`);
      console.log(`    Author Review Files: ${m.authorCopyEditReview?.uploadedFiles?.length || 0} files`);
      console.log(`    Author Approved: ${m.authorCopyEditReview?.approved}`);
      console.log('');
    });
    
    // Find published manuscripts
    console.log('\n📚 Published manuscripts:');
    const published = allManuscripts.filter(m => m.status === 'published');
    console.log(`Found ${published.length} published manuscripts:`);
    published.forEach(m => {
      console.log(`  - ${m.title}`);
      console.log(`    Published Date: ${m.publishedDate}`);
      console.log('');
    });
    
    // Find manuscripts that might be ready but in different states
    console.log('\n🔍 Potential ready manuscripts (different status combinations):');
    const potentialReady = allManuscripts.filter(m => 
      (m.copyEditingStage === 'author-approved' && m.status !== 'published') ||
      (m.status === 'copy-editing-complete') ||
      (m.status === 'in-production')
    );
    
    console.log(`Found ${potentialReady.length} potentially ready manuscripts:`);
    potentialReady.forEach(m => {
      console.log(`  - ${m.title}`);
      console.log(`    Status: ${m.status}`);
      console.log(`    Copy Editing Stage: ${m.copyEditingStage}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking manuscripts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkManuscripts();
