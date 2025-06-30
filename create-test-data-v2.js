require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function createTestData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');
    
    // Import the actual models from the project
    const User = (await import('./src/models/User.js')).default;
    const Manuscript = (await import('./src/models/Manuscript.js')).default;
    
    // Check if there are users, if not create one
    let user = await User.findOne({});
    if (!user) {
      console.log('No users found. Creating a dummy user...');
      user = await User.create({
        name: 'Test Author',
        email: 'testauthor@example.com',
        role: 'author',
        username: 'testauthor'
      });
      console.log('Created dummy user:', user._id);
    }
    
    // Create a test manuscript ready for publication
    const testManuscript = await Manuscript.create({
      title: 'Advanced Neural Network Applications in Medical Diagnosis',
      abstract: 'This paper presents a comprehensive study on the application of neural networks in medical diagnosis, focusing on image recognition and pattern analysis. The research demonstrates significant improvements in diagnostic accuracy using deep learning techniques.',
      keywords: ['neural networks', 'medical diagnosis', 'machine learning', 'image recognition'],
      authors: [
        {
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@university.edu',
          affiliation: 'University of Technology',
          orcid: '0000-0000-0000-0001',
          isCorresponding: true
        },
        {
          name: 'Prof. Michael Chen',
          email: 'm.chen@medschool.edu',
          affiliation: 'Medical School Institute',
          orcid: '0000-0000-0000-0002',
          isCorresponding: false
        }
      ],
      correspondingAuthor: 'sarah.johnson@university.edu',
      submittedBy: user._id,
      status: 'ready-for-publication',
      copyEditingStage: 'author-approved',
      category: 'Research Article',
      submissionDate: new Date('2024-01-15'),
      lastModified: new Date(),
      latestManuscriptFiles: [
        {
          originalName: 'neural-networks-medical-diagnosis-final.pdf',
          filename: 'manuscripts/neural-networks-final-v3',
          url: 'https://res.cloudinary.com/demo/raw/upload/manuscripts/neural-networks-final-v3.pdf',
          type: 'manuscript-final',
          uploadedBy: user._id,
          uploadedAt: new Date(),
          size: 2457600,
          mimeType: 'application/pdf',
          version: 'author-review-v3',
          isCurrentVersion: true
        },
        {
          originalName: 'supplementary-data.xlsx',
          filename: 'manuscripts/neural-networks-supp-data',
          url: 'https://res.cloudinary.com/demo/raw/upload/manuscripts/neural-networks-supp-data.xlsx',
          type: 'supplement',
          uploadedBy: user._id,
          uploadedAt: new Date(),
          size: 89600,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          version: 'author-review-v3',
          isCurrentVersion: true
        }
      ],
      authorCopyEditReview: {
        decision: 'approved',
        comments: 'All suggested changes have been incorporated. The manuscript is ready for publication.',
        submittedAt: new Date('2024-06-20'),
        files: [
          {
            originalName: 'neural-networks-medical-diagnosis-final.pdf',
            filename: 'manuscripts/neural-networks-final-v3',
            url: 'https://res.cloudinary.com/demo/raw/upload/manuscripts/neural-networks-final-v3.pdf',
            uploadedAt: new Date('2024-06-20')
          }
        ]
      },
      timeline: [
        {
          event: 'Manuscript Submitted',
          description: 'Initial manuscript submission',
          date: new Date('2024-01-15'),
          performedBy: user._id
        },
        {
          event: 'Copy Editing Completed',
          description: 'Copy editor completed review and sent to author',
          date: new Date('2024-06-15'),
          performedBy: user._id
        },
        {
          event: 'Author Review Completed',
          description: 'Author approved changes and submitted final version',
          date: new Date('2024-06-20'),
          performedBy: user._id
        }
      ]
    });
    
    console.log('Created test manuscript:', testManuscript._id);
    console.log('Title:', testManuscript.title);
    console.log('Status:', testManuscript.status);
    console.log('Copy Editing Stage:', testManuscript.copyEditingStage);
    console.log('Files:', testManuscript.latestManuscriptFiles.length);
    
    await mongoose.disconnect();
    console.log('Test data created successfully!');
    
  } catch (error) {
    console.error('Error creating test data:', error);
    await mongoose.disconnect();
  }
}

createTestData();
