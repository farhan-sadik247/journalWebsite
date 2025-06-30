/**
 * Database migration script to add assignedEditor field to existing manuscripts
 * This ensures that the field exists in all documents for proper population
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/journal';

async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  
  return mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function migrateManuscripts() {
  try {
    console.log('🔄 Starting manuscript migration...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');
    
    // Get the Manuscript collection directly
    const db = mongoose.connection.db;
    const manuscriptsCollection = db.collection('manuscripts');
    
    // Add assignedEditor field to all documents that don't have it
    const result = await manuscriptsCollection.updateMany(
      { assignedEditor: { $exists: false } }, // Documents without assignedEditor field
      { $set: { assignedEditor: null } } // Add the field with null value
    );
    
    console.log(`✅ Migration complete! Updated ${result.modifiedCount} documents`);
    console.log(`📊 Found ${result.matchedCount} documents without assignedEditor field`);
    
    // Also add latestManuscriptFiles field if it doesn't exist
    const result2 = await manuscriptsCollection.updateMany(
      { latestManuscriptFiles: { $exists: false } }, 
      { $set: { latestManuscriptFiles: [] } }
    );
    
    console.log(`✅ Added latestManuscriptFiles to ${result2.modifiedCount} documents`);
    
    mongoose.connection.close();
    console.log('🎯 Migration complete and connection closed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateManuscripts();
