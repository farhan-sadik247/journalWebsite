// Quick script to check and create test volumes
import connectToDatabase from '../lib/mongodb.js';
import Volume from '../models/Volume.js';

async function checkAndCreateTestData() {
  try {
    await connectToDatabase();
    
    // Check existing volumes
    const existingVolumes = await Volume.find({});
    console.log('📚 Existing volumes:', existingVolumes.length);
    
    if (existingVolumes.length === 0) {
      console.log('📝 Creating test volume...');
      
      const testVolume = new Volume({
        number: 1,
        year: 2025,
        title: 'Volume 1',
        description: 'First volume of the journal',
        status: 'published',
        createdBy: '507f1f77bcf86cd799439011', // Dummy ObjectId
        issues: [
          {
            number: 1,
            title: 'Issue 1',
            description: 'First issue',
            isPublished: true,
            publishedDate: new Date(),
            manuscripts: []
          }
        ]
      });
      
      await testVolume.save();
      console.log('✅ Test volume created successfully');
    } else {
      console.log('📚 Volumes already exist:');
      existingVolumes.forEach(vol => {
        console.log(`  - Volume ${vol.number} (${vol.year}): ${vol.title} - ${vol.issues?.length || 0} issues`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndCreateTestData();
