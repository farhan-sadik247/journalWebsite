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

async function createSimpleTestManuscripts() {
  try {
    await connectDB();
    
    console.log('\n🛠️  Creating simple test manuscripts...');
    
    // Get the existing manuscripts collection directly
    const db = mongoose.connection.db;
    const manuscripts = db.collection('manuscripts');
    
    // Create a simple manuscript ready for publication
    const readyManuscript = {
      title: 'Advanced Machine Learning Techniques for Natural Language Processing',
      abstract: 'This paper presents advanced machine learning techniques for natural language processing applications.',
      keywords: ['machine learning', 'NLP', 'artificial intelligence'],
      authors: [
        {
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@university.edu',
          affiliation: 'University of Technology',
          orcid: '',
          isCorresponding: true
        }
      ],
      correspondingAuthor: 'Dr. Sarah Johnson',
      submittedBy: new mongoose.Types.ObjectId(), // Dummy ObjectId
      files: [
        {
          filename: 'ml-nlp-manuscript.pdf',
          originalName: 'Advanced_ML_NLP.pdf',
          cloudinaryId: 'ml_nlp_v1',
          url: '/uploads/ml-nlp-manuscript.pdf',
          type: 'manuscript',
          size: 1024000,
          version: 1,
          uploadDate: new Date('2024-11-15')
        }
      ],
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved',
      submissionDate: new Date('2024-11-15'),
      lastModified: new Date(),
      category: 'Computer Science',
      latestManuscriptFiles: [
        {
          originalName: 'Advanced_ML_NLP_Final.pdf',
          filename: 'ml-nlp-final-version.pdf',
          url: '/uploads/ml-nlp-final-version.pdf',
          type: 'manuscript-final',
          uploadedBy: new mongoose.Types.ObjectId(),
          uploadedAt: new Date('2024-12-28'),
          size: 1050000,
          mimeType: 'application/pdf',
          version: 'author-review-v2',
          isCurrentVersion: true
        }
      ],
      authorCopyEditReview: {
        approval: 'approved',
        comments: 'All copy editor suggestions have been incorporated. Ready for publication.',
        reviewedAt: new Date('2024-12-28'),
        reviewedBy: new mongoose.Types.ObjectId(),
        files: [
          {
            originalName: 'ML_NLP_Author_Revised.pdf',
            filename: 'ml-nlp-author-revised.pdf',
            url: '/uploads/ml-nlp-author-revised.pdf',
            type: 'author-review-file',
            uploadedBy: new mongoose.Types.ObjectId(),
            uploadedAt: new Date('2024-12-28'),
            size: 1050000,
            mimeType: 'application/pdf'
          }
        ]
      },
      timeline: [
        {
          event: 'submission',
          description: 'Initial submission received',
          date: new Date('2024-11-15'),
          performedBy: new mongoose.Types.ObjectId(),
          metadata: {}
        },
        {
          event: 'copy-editing-complete',
          description: 'Copy editing completed and approved by author',
          date: new Date('2024-12-28'),
          performedBy: new mongoose.Types.ObjectId(),
          metadata: {}
        }
      ]
    };
    
    // Create another ready manuscript
    const readyManuscript2 = {
      title: 'Quantum Computing Applications in Cryptography',
      abstract: 'This research explores quantum computing applications in modern cryptography systems.',
      keywords: ['quantum computing', 'cryptography', 'security'],
      authors: [
        {
          name: 'Dr. Alan Quantum',
          email: 'alan.quantum@techuniv.edu',
          affiliation: 'Tech University',
          orcid: '',
          isCorresponding: true
        }
      ],
      correspondingAuthor: 'Dr. Alan Quantum',
      submittedBy: new mongoose.Types.ObjectId(),
      files: [
        {
          filename: 'quantum-crypto-manuscript.pdf',
          originalName: 'Quantum_Crypto_Research.pdf',
          cloudinaryId: 'quantum_crypto_v1',
          url: '/uploads/quantum-crypto-manuscript.pdf',
          type: 'manuscript',
          size: 980000,
          version: 1,
          uploadDate: new Date('2024-10-20')
        }
      ],
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved',
      submissionDate: new Date('2024-10-20'),
      lastModified: new Date(),
      category: 'Physics',
      latestManuscriptFiles: [
        {
          originalName: 'Quantum_Crypto_Final.pdf',
          filename: 'quantum-crypto-final.pdf',
          url: '/uploads/quantum-crypto-final.pdf',
          type: 'manuscript-final',
          uploadedBy: new mongoose.Types.ObjectId(),
          uploadedAt: new Date('2024-12-30'),
          size: 1000000,
          mimeType: 'application/pdf',
          version: 'author-review-v1',
          isCurrentVersion: true
        }
      ],
      authorCopyEditReview: {
        approval: 'approved',
        comments: 'Minor corrections applied as suggested by copy editor.',
        reviewedAt: new Date('2024-12-30'),
        reviewedBy: new mongoose.Types.ObjectId(),
        files: [
          {
            originalName: 'Quantum_Crypto_Author_Final.pdf',
            filename: 'quantum-crypto-author-final.pdf',
            url: '/uploads/quantum-crypto-author-final.pdf',
            type: 'author-review-file',
            uploadedBy: new mongoose.Types.ObjectId(),
            uploadedAt: new Date('2024-12-30'),
            size: 1000000,
            mimeType: 'application/pdf'
          }
        ]
      },
      timeline: [
        {
          event: 'submission',
          description: 'Initial submission received',
          date: new Date('2024-10-20'),
          performedBy: new mongoose.Types.ObjectId(),
          metadata: {}
        },
        {
          event: 'copy-editing-complete',
          description: 'Copy editing completed and approved by author',
          date: new Date('2024-12-30'),
          performedBy: new mongoose.Types.ObjectId(),
          metadata: {}
        }
      ]
    };
    
    // Insert manuscripts
    await manuscripts.insertOne(readyManuscript);
    console.log(`✅ Created ready manuscript: ${readyManuscript.title}`);
    
    await manuscripts.insertOne(readyManuscript2);
    console.log(`✅ Created ready manuscript: ${readyManuscript2.title}`);
    
    console.log('\n📊 Test manuscripts created successfully!');
    
    // Verify creation
    const readyCount = await manuscripts.countDocuments({ 
      status: 'ready-for-publication', 
      copyEditingStage: 'author-approved' 
    });
    
    const publishedCount = await manuscripts.countDocuments({ 
      status: 'published'
    });
    
    console.log(`\n📈 Current manuscript counts:`);
    console.log(`  Ready for Publication: ${readyCount}`);
    console.log(`  Published: ${publishedCount}`);
    
    // List all ready manuscripts
    console.log('\n🎯 Ready for Publication manuscripts:');
    const readyManuscripts = await manuscripts.find({ 
      status: 'ready-for-publication', 
      copyEditingStage: 'author-approved' 
    }).toArray();
    
    readyManuscripts.forEach(m => {
      console.log(`  - ${m.title}`);
      console.log(`    Status: ${m.status}`);
      console.log(`    Copy Editing Stage: ${m.copyEditingStage}`);
      console.log(`    Latest Files: ${m.latestManuscriptFiles?.length || 0} files`);
      console.log(`    Author Review Files: ${m.authorCopyEditReview?.files?.length || 0} files`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error creating test manuscripts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createSimpleTestManuscripts();
