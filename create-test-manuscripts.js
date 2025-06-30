// Script to create test manuscripts for publication testing
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function createTestManuscripts() {
  try {
    console.log('🚀 Creating test manuscripts...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import models (we'll define simplified schemas for testing)
    const manuscriptSchema = new mongoose.Schema({
      title: String,
      abstract: String,
      keywords: [String],
      authors: [{
        name: String,
        email: String,
        affiliation: String,
        isCorresponding: Boolean
      }],
      correspondingAuthor: String,
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: String,
      copyEditingStage: String,
      category: String,
      submissionDate: Date,
      lastModified: Date,
      publishedDate: Date,
      latestManuscriptFiles: [{
        originalName: String,
        filename: String,
        url: String,
        type: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: Date,
        size: Number,
        mimeType: String,
        version: String,
        isCurrentVersion: Boolean
      }],
      authorCopyEditReview: {
        decision: String,
        comments: String,
        submittedAt: Date
      },
      timeline: [{
        event: String,
        description: String,
        date: Date,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }]
    }, { timestamps: true });

    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String
    });

    const Manuscript = mongoose.models.Manuscript || mongoose.model('Manuscript', manuscriptSchema);
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Create a test user if none exists
    let testUser = await User.findOne({});
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        role: 'author'
      });
      console.log('✅ Created test user');
    }

    // Create test manuscripts in different stages
    const testManuscripts = [
      {
        title: 'Ready to Publish Manuscript 1',
        abstract: 'This is a test manuscript ready for publication',
        keywords: ['test', 'publication', 'ready'],
        authors: [{
          name: 'Dr. John Doe',
          email: 'john@example.com',
          affiliation: 'Test University',
          isCorresponding: true
        }],
        correspondingAuthor: 'john@example.com',
        submittedBy: testUser._id,
        status: 'ready-for-publication',
        copyEditingStage: 'author-approved',
        category: 'Research Article',
        submissionDate: new Date('2024-01-15'),
        lastModified: new Date(),
        latestManuscriptFiles: [{
          originalName: 'test-manuscript-1.pdf',
          filename: 'test-manuscript-1',
          url: 'https://example.com/test-manuscript-1.pdf',
          type: 'manuscript-final',
          uploadedBy: testUser._id,
          uploadedAt: new Date(),
          size: 1024000,
          mimeType: 'application/pdf',
          version: 'v1',
          isCurrentVersion: true
        }],
        authorCopyEditReview: {
          decision: 'approved',
          comments: 'All changes look good',
          submittedAt: new Date()
        }
      },
      {
        title: 'Another Ready to Publish Manuscript',
        abstract: 'This is another test manuscript ready for publication',
        keywords: ['test', 'publication', 'second'],
        authors: [{
          name: 'Dr. Jane Smith',
          email: 'jane@example.com',
          affiliation: 'Test Institute',
          isCorresponding: true
        }],
        correspondingAuthor: 'jane@example.com',
        submittedBy: testUser._id,
        status: 'ready-for-publication',
        copyEditingStage: 'author-approved',
        category: 'Review Article',
        submissionDate: new Date('2024-02-01'),
        lastModified: new Date(),
        latestManuscriptFiles: [{
          originalName: 'test-manuscript-2.pdf',
          filename: 'test-manuscript-2',
          url: 'https://example.com/test-manuscript-2.pdf',
          type: 'manuscript-final',
          uploadedBy: testUser._id,
          uploadedAt: new Date(),
          size: 2048000,
          mimeType: 'application/pdf',
          version: 'v1',
          isCurrentVersion: true
        }],
        authorCopyEditReview: {
          decision: 'approved',
          comments: 'Ready for publication',
          submittedAt: new Date()
        }
      },
      {
        title: 'Published Test Manuscript',
        abstract: 'This is a test manuscript that is already published',
        keywords: ['test', 'published', 'archive'],
        authors: [{
          name: 'Dr. Bob Johnson',
          email: 'bob@example.com',
          affiliation: 'Published University',
          isCorresponding: true
        }],
        correspondingAuthor: 'bob@example.com',
        submittedBy: testUser._id,
        status: 'published',
        copyEditingStage: 'author-approved',
        category: 'Research Article',
        submissionDate: new Date('2023-12-01'),
        lastModified: new Date(),
        publishedDate: new Date(),
        doi: '10.1234/test.published.1',
        volume: 1,
        issue: 1,
        pages: '1-10'
      }
    ];

    // Insert test manuscripts
    for (const manuscriptData of testManuscripts) {
      // Check if manuscript already exists
      const existingManuscript = await Manuscript.findOne({ title: manuscriptData.title });
      if (!existingManuscript) {
        const manuscript = await Manuscript.create(manuscriptData);
        console.log(`✅ Created manuscript: "${manuscript.title}" (Status: ${manuscript.status})`);
      } else {
        console.log(`ℹ️ Manuscript already exists: "${manuscriptData.title}"`);
      }
    }

    console.log('\n🎉 Test manuscripts creation completed!');
    
    // Show summary
    const allManuscripts = await Manuscript.find({});
    console.log(`\n📊 Total manuscripts in database: ${allManuscripts.length}`);
    
    const readyCount = await Manuscript.countDocuments({ 
      $or: [
        { status: 'ready-for-publication' },
        { copyEditingStage: 'author-approved' }
      ]
    });
    console.log(`📋 Ready to publish: ${readyCount}`);
    
    const publishedCount = await Manuscript.countDocuments({ status: 'published' });
    console.log(`📚 Published: ${publishedCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating test manuscripts:', error);
    await mongoose.disconnect();
  }
}

createTestManuscripts();
