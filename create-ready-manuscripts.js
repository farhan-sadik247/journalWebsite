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
  authors: [String],
  status: String,
  copyEditingStage: String,
  submissionDate: Date,
  lastModified: Date,
  publishedDate: Date,
  category: String,
  latestManuscriptFiles: [{
    filename: String,
    uploadDate: Date,
    type: String,
    url: String
  }],
  authorCopyEditReview: {
    approved: Boolean,
    uploadedFiles: [{
      filename: String,
      uploadDate: Date,
      type: String,
      url: String
    }],
    comments: String,
    submittedAt: Date
  },
  timeline: [{
    stage: String,
    status: String,
    date: Date,
    comments: String
  }]
}, { collection: 'manuscripts' });

const Manuscript = mongoose.model('Manuscript', manuscriptSchema);

async function createTestManuscripts() {
  try {
    await connectDB();
    
    console.log('\n🛠️  Creating test manuscripts for publication dashboard...');
    
    // Create a manuscript that's ready for publication
    const readyManuscript = new Manuscript({
      title: 'Advanced Machine Learning Techniques for Natural Language Processing',
      authors: ['Dr. Sarah Johnson', 'Prof. Michael Chen', 'Dr. Emma Rodriguez'],
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved',
      submissionDate: new Date('2024-11-15'),
      lastModified: new Date(),
      category: 'Computer Science',
      latestManuscriptFiles: [
        {
          filename: 'ml-nlp-final-version.pdf',
          uploadDate: new Date('2024-12-01'),
          type: 'pdf',
          url: '/uploads/ml-nlp-final-version.pdf'
        },
        {
          filename: 'supplementary-data.xlsx',
          uploadDate: new Date('2024-12-01'),
          type: 'xlsx',
          url: '/uploads/supplementary-data.xlsx'
        }
      ],
      authorCopyEditReview: {
        approved: true,
        uploadedFiles: [
          {
            filename: 'ml-nlp-author-revised.pdf',
            uploadDate: new Date('2024-12-28'),
            type: 'pdf',
            url: '/uploads/ml-nlp-author-revised.pdf'
          }
        ],
        comments: 'All copy editor suggestions have been incorporated. Ready for publication.',
        submittedAt: new Date('2024-12-28')
      },
      timeline: [
        {
          stage: 'submission',
          status: 'completed',
          date: new Date('2024-11-15'),
          comments: 'Initial submission received'
        },
        {
          stage: 'review',
          status: 'completed',
          date: new Date('2024-11-30'),
          comments: 'Peer review completed - accepted'
        },
        {
          stage: 'copy-editing',
          status: 'completed',
          date: new Date('2024-12-15'),
          comments: 'Copy editing completed'
        },
        {
          stage: 'author-review',
          status: 'completed',
          date: new Date('2024-12-28'),
          comments: 'Author approved copy editing changes'
        }
      ]
    });
    
    // Create another ready manuscript
    const readyManuscript2 = new Manuscript({
      title: 'Quantum Computing Applications in Cryptography',
      authors: ['Dr. Alan Quantum', 'Prof. Alice Crypto'],
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved',
      submissionDate: new Date('2024-10-20'),
      lastModified: new Date(),
      category: 'Physics',
      latestManuscriptFiles: [
        {
          filename: 'quantum-crypto-final.pdf',
          uploadDate: new Date('2024-11-25'),
          type: 'pdf',
          url: '/uploads/quantum-crypto-final.pdf'
        }
      ],
      authorCopyEditReview: {
        approved: true,
        uploadedFiles: [
          {
            filename: 'quantum-crypto-author-final.pdf',
            uploadDate: new Date('2024-12-30'),
            type: 'pdf',
            url: '/uploads/quantum-crypto-author-final.pdf'
          }
        ],
        comments: 'Minor corrections applied as suggested by copy editor.',
        submittedAt: new Date('2024-12-30')
      },
      timeline: [
        {
          stage: 'submission',
          status: 'completed',
          date: new Date('2024-10-20'),
          comments: 'Initial submission received'
        },
        {
          stage: 'review',
          status: 'completed',
          date: new Date('2024-11-10'),
          comments: 'Peer review completed - accepted'
        },
        {
          stage: 'copy-editing',
          status: 'completed',
          date: new Date('2024-12-10'),
          comments: 'Copy editing completed'
        },
        {
          stage: 'author-review',
          status: 'completed',
          date: new Date('2024-12-30'),
          comments: 'Author approved copy editing changes'
        }
      ]
    });
    
    // Create a manuscript in production
    const inProductionManuscript = new Manuscript({
      title: 'Sustainable Energy Solutions for Smart Cities',
      authors: ['Dr. Green Energy', 'Prof. Smart City'],
      status: 'in-production',
      copyEditingStage: 'in-progress',
      submissionDate: new Date('2024-12-01'),
      lastModified: new Date(),
      category: 'Environmental Science',
      latestManuscriptFiles: [
        {
          filename: 'smart-cities-energy.pdf',
          uploadDate: new Date('2024-12-15'),
          type: 'pdf',
          url: '/uploads/smart-cities-energy.pdf'
        }
      ],
      timeline: [
        {
          stage: 'submission',
          status: 'completed',
          date: new Date('2024-12-01'),
          comments: 'Initial submission received'
        },
        {
          stage: 'review',
          status: 'completed',
          date: new Date('2024-12-20'),
          comments: 'Peer review completed - accepted'
        },
        {
          stage: 'copy-editing',
          status: 'in-progress',
          date: new Date('2024-12-25'),
          comments: 'Copy editing in progress'
        }
      ]
    });
    
    // Save all manuscripts
    await readyManuscript.save();
    console.log(`✅ Created ready manuscript: ${readyManuscript.title}`);
    
    await readyManuscript2.save();
    console.log(`✅ Created ready manuscript: ${readyManuscript2.title}`);
    
    await inProductionManuscript.save();
    console.log(`✅ Created in-production manuscript: ${inProductionManuscript.title}`);
    
    console.log('\n📊 Test manuscripts created successfully!');
    
    // Verify creation
    const readyCount = await Manuscript.countDocuments({ 
      status: 'ready-for-publication', 
      copyEditingStage: 'author-approved' 
    });
    
    const inProductionCount = await Manuscript.countDocuments({ 
      status: 'in-production'
    });
    
    const publishedCount = await Manuscript.countDocuments({ 
      status: 'published'
    });
    
    console.log(`\n📈 Current manuscript counts:`);
    console.log(`  Ready for Publication: ${readyCount}`);
    console.log(`  In Production: ${inProductionCount}`);
    console.log(`  Published: ${publishedCount}`);
    
  } catch (error) {
    console.error('❌ Error creating test manuscripts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createTestManuscripts();
