/**
 * Script to clear Mongoose model cache and force fresh model registration
 * This helps when schema changes aren't being recognized
 */

const mongoose = require('mongoose');

console.log('🔄 Clearing Mongoose model cache...');

// Clear all cached models
if (mongoose.models) {
  Object.keys(mongoose.models).forEach(modelName => {
    delete mongoose.models[modelName];
  });
  console.log('✅ Cleared cached models:', Object.keys(mongoose.models).length === 0 ? 'SUCCESS' : 'PARTIAL');
}

// Clear all cached schemas
if (mongoose.modelSchemas) {
  Object.keys(mongoose.modelSchemas).forEach(schemaName => {
    delete mongoose.modelSchemas[schemaName];
  });
  console.log('✅ Cleared cached schemas');
}

// Force close any existing connections
if (mongoose.connection.readyState !== 0) {
  mongoose.connection.close();
  console.log('✅ Closed existing database connection');
}

console.log('🎯 Model cache cleared. Restart the server for changes to take effect.');
console.log('💡 If the issue persists, the assignedEditor field might need to be added to existing documents in the database.');
