/**
 * Setup script to create directory structure on cPanel storage
 * This script will create the necessary folders in your /public_html/JournalWeb directory
 */

import { cpanelStorage } from '../lib/storage';
import { Client } from 'basic-ftp';

const directories = [
  'manuscripts',
  'manuscripts/general',
  'reviews',
  'galley-proofs',
  'profile-images',
  'journal/covers',
  'images',
  'categories',
  'uploads'
];

async function createDirectoryStructure() {
  const client = new Client();
  
  try {
    console.log('🔧 Setting up directory structure on cPanel...\n');
    
    await client.access({
      host: process.env.FTP_HOST || '',
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASSWORD || '',
      secure: false,
    });

    // Create base directory
    const basePath = '/public_html/JournalWeb';
    
    try {
      await client.ensureDir(basePath);
      console.log(`✓ Created base directory: ${basePath}`);
    } catch (error) {
      console.log(`ℹ️  Base directory ${basePath} already exists or couldn't be created`);
    }

    // Create subdirectories
    for (const dir of directories) {
      const fullPath = `${basePath}/${dir}`;
      try {
        await client.ensureDir(fullPath);
        console.log(`✓ Created directory: ${fullPath}`);
      } catch (error) {
        console.log(`ℹ️  Directory ${fullPath} already exists or couldn't be created`);
      }
    }

    console.log('\n🎉 Directory structure setup completed!');
    console.log('\nCreated directories:');
    directories.forEach(dir => {
      console.log(`  - ${basePath}/${dir}`);
    });

  } catch (error) {
    console.error('❌ Error setting up directories:', error);
    throw error;
  } finally {
    client.close();
  }
}

async function testUpload() {
  try {
    console.log('\n🧪 Testing file upload...');
    
    // Create a test file
    const testContent = Buffer.from('This is a test file to verify the upload functionality.');
    const result = await cpanelStorage.uploadFile(testContent, 'test-upload.txt', 'uploads');
    
    console.log('✅ Test upload successful!');
    console.log(`📁 File URL: ${result.secure_url}`);
    console.log(`📊 File size: ${result.bytes} bytes`);
    
    // Clean up test file
    try {
      await cpanelStorage.deleteFile('uploads/test-upload.txt');
      console.log('🗑️  Test file cleaned up');
    } catch (error) {
      console.log('ℹ️  Could not clean up test file (this is normal)');
    }
    
  } catch (error) {
    console.error('❌ Test upload failed:', error);
    throw error;
  }
}

async function runSetup() {
  console.log('🚀 Starting cPanel storage setup...\n');
  
  // Check if FTP credentials are configured
  if (!process.env.FTP_HOST || !process.env.FTP_USER || !process.env.FTP_PASSWORD) {
    console.error('❌ FTP credentials not configured. Please update your .env.local file with:');
    console.error('- FTP_HOST=ftp.gjadt.org');
    console.error('- FTP_USER=your-ftp-username');
    console.error('- FTP_PASSWORD=your-ftp-password');
    console.error('- DOMAIN_BASE_URL=https://gjadt.org');
    process.exit(1);
  }
  
  try {
    await createDirectoryStructure();
    await testUpload();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SETUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('Your cPanel storage is now ready for file uploads.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run the migration script to transfer existing files:');
    console.log('   npm run ts-node src/scripts/migrate-to-cpanel-storage.ts');
    console.log('');
    console.log('2. Test your application to ensure file uploads work correctly');
    console.log('');
    console.log('3. Once everything is working, you can remove Cloudinary dependencies');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    console.log('\nPlease check your FTP credentials and try again.');
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  runSetup();
}
