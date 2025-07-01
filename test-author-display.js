const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/journal');

const manuscriptSchema = new mongoose.Schema({
  title: String,
  abstract: String,
  authors: [{
    name: String,
    email: String,
    affiliation: String,
    orcid: String,
    isCorresponding: Boolean
  }],
  category: String,
  keywords: [String],
  status: String,
  publishedDate: Date,
  volume: Number,
  issue: Number,
  pages: String,
  doi: String,
  metrics: {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    citations: { type: Number, default: 0 }
  }
});

const Manuscript = mongoose.model('Manuscript', manuscriptSchema);

async function testAuthorDisplay() {
  try {
    // Check if we have any published manuscripts
    const published = await Manuscript.find({ status: 'published' }).limit(1);
    
    if (published.length === 0) {
      console.log('No published manuscripts found. Creating a test article...');
      
      // Create a test published manuscript
      const testManuscript = new Manuscript({
        title: "Advanced Machine Learning Techniques in Biomedical Research",
        abstract: "This study explores the application of advanced machine learning techniques in biomedical research, focusing on diagnostic accuracy and treatment optimization. We present novel algorithms that demonstrate significant improvements in patient outcomes.",
        authors: [
          {
            name: "Dr. Sarah Johnson",
            email: "sarah.johnson@university.edu",
            affiliation: "Department of Computer Science, University of Technology",
            orcid: "0000-0000-0000-0001",
            isCorresponding: true
          },
          {
            name: "Prof. Michael Chen",
            email: "michael.chen@medical.edu",
            affiliation: "Medical Research Institute",
            orcid: "0000-0000-0000-0002",
            isCorresponding: false
          },
          {
            name: "Dr. Emily Rodriguez",
            email: "emily.rodriguez@biotech.com",
            affiliation: "BioTech Research Labs",
            isCorresponding: false
          }
        ],
        category: "Computer Science",
        keywords: ["machine learning", "biomedical research", "diagnostic accuracy", "algorithms"],
        status: "published",
        publishedDate: new Date(),
        volume: 1,
        issue: 1,
        pages: "1-15",
        doi: "10.1000/journal.v1i1.001",
        metrics: {
          views: 125,
          downloads: 45,
          citations: 8
        }
      });
      
      await testManuscript.save();
      console.log('Test manuscript created successfully!');
      console.log('Article ID:', testManuscript._id);
      console.log('Authors:', testManuscript.authors.map(a => a.name));
    } else {
      console.log('Found published manuscripts:', published.length);
      console.log('Sample manuscript ID:', published[0]._id);
      console.log('Sample authors:', published[0].authors.map(a => a.name));
    }
    
    // Test fetching published manuscripts
    const allPublished = await Manuscript.find({ status: 'published' }).select('title authors');
    console.log('\nAll published manuscripts:');
    allPublished.forEach(manuscript => {
      console.log(`- ${manuscript.title}`);
      console.log(`  Authors: ${manuscript.authors.map(a => a.name).join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAuthorDisplay();
