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

async function checkUsers() {
  try {
    await connectDB();
    
    console.log('\n👥 Checking users in database...');
    
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Get all users
    const allUsers = await users.find({}).toArray();
    console.log(`Total users: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('\n📋 Users list:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'No name'} (${user.email})`);
        console.log(`   Role: ${user.role || 'No role'}`);
        console.log(`   Roles Array: ${JSON.stringify(user.roles || [])}`);
        console.log(`   Current Active Role: ${user.currentActiveRole || 'None'}`);
        console.log('');
      });
      
      // Check for editors
      const editors = allUsers.filter(user => 
        user.role === 'editor' || 
        (user.roles && user.roles.includes('editor')) ||
        user.currentActiveRole === 'editor'
      );
      
      console.log(`📝 Editors found: ${editors.length}`);
      if (editors.length > 0) {
        console.log('Editor accounts:');
        editors.forEach(editor => {
          console.log(`  - ${editor.name} (${editor.email})`);
        });
      }
      
      // Check for admins
      const admins = allUsers.filter(user => 
        user.role === 'admin' || 
        (user.roles && user.roles.includes('admin')) ||
        user.currentActiveRole === 'admin'
      );
      
      console.log(`\n👑 Admins found: ${admins.length}`);
      if (admins.length > 0) {
        console.log('Admin accounts:');
        admins.forEach(admin => {
          console.log(`  - ${admin.name} (${admin.email})`);
        });
      }
    } else {
      console.log('No users found in database.');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUsers();
