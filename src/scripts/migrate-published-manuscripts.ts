// Script to migrate published manuscripts to Volume 1, Issue 1
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import connectToDatabase from '../lib/mongodb.js';
import Manuscript from '../models/Manuscript.js';
import Volume from '../models/Volume.js';

async function migratePublishedManuscripts() {
  try {
    await connectToDatabase();
    
    console.log('🔍 Finding published manuscripts...');
    
    // Find published manuscripts
    const publishedManuscripts = await Manuscript.find({
      status: 'published',
      publishedDate: { $exists: true }
    });
    
    console.log(`📚 Found ${publishedManuscripts.length} published manuscripts`);
    
    if (publishedManuscripts.length === 0) {
      console.log('✅ No published manuscripts found to migrate');
      return;
    }
    
    // Find or create Volume 1
    let volume1 = await Volume.findOne({ number: 1 });
    
    if (!volume1) {
      console.log('📖 Creating Volume 1...');
      volume1 = new Volume({
        number: 1,
        year: 2025,
        title: 'Volume 1',
        description: 'First volume of the journal',
        status: 'published',
        isPublished: true,
        publishedDate: new Date(),
        createdBy: publishedManuscripts[0].authors[0] || 'system', // Use first author as creator
        issues: []
      });
    }
    
    // Find or create Issue 1 in Volume 1
    let issue1 = volume1.issues.find((issue: any) => issue.number === 1);
    
    if (!issue1) {
      console.log('📄 Creating Issue 1 in Volume 1...');
      volume1.issues.push({
        number: 1,
        title: 'Issue 1',
        description: 'First issue of Volume 1',
        isPublished: true,
        publishedDate: new Date(),
        manuscripts: publishedManuscripts.map(m => m._id)
      });
      issue1 = volume1.issues[volume1.issues.length - 1];
    } else {
      // Add published manuscripts to existing issue
      const existingManuscriptIds = issue1.manuscripts.map((id: any) => id.toString());
      const newManuscriptIds = publishedManuscripts
        .filter(m => !existingManuscriptIds.includes(m._id.toString()))
        .map(m => m._id);
      
      issue1.manuscripts.push(...newManuscriptIds);
      issue1.isPublished = true;
      if (!issue1.publishedDate) {
        issue1.publishedDate = new Date();
      }
    }
    
    // Save the volume
    await volume1.save();
    console.log('💾 Volume 1 with Issue 1 saved');
    
    // Update each published manuscript to assign to Volume 1, Issue 1
    const updatePromises = publishedManuscripts.map(manuscript => 
      Manuscript.findByIdAndUpdate(manuscript._id, {
        volume: 1,
        issue: 1
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Successfully migrated ${publishedManuscripts.length} published manuscripts to Volume 1, Issue 1`);
    
    // Print details
    publishedManuscripts.forEach((manuscript, index) => {
      console.log(`  ${index + 1}. "${manuscript.title}" by ${manuscript.authors.map((a: any) => a.name).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error migrating manuscripts:', error);
  }
}

// Run the migration
migratePublishedManuscripts().then(() => {
  console.log('🏁 Migration completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
