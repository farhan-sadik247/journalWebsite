/**
 * Setup script for local file storage
 * Creates necessary directories for file uploads
 */

const fs = require('fs').promises;
const path = require('path');

const directories = [
  'public/uploads',
  'public/uploads/manuscripts',
  'public/uploads/images',
  'public/uploads/galley-proofs',
  'public/uploads/revisions',
  'public/uploads/reviews',
  'public/uploads/user-manuals',
  'public/uploads/profile-images',
  'public/uploads/cover-images',
  'public/uploads/categories',
  'public/uploads/general'
];

async function createDirectory(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);
  
  try {
    await fs.access(fullPath);
    console.log(`✓ Directory already exists: ${dirPath}`);
  } catch {
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✓ Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`✗ Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }
}

async function createUploadDirectories() {
  console.log('Setting up upload directories...\n');
  
  for (const dir of directories) {
    await createDirectory(dir);
  }
  
  // Create .gitkeep files to ensure directories are tracked in git
  for (const dir of directories) {
    const gitkeepPath = path.join(process.cwd(), dir, '.gitkeep');
    try {
      await fs.writeFile(gitkeepPath, '# This file ensures the directory is tracked in git\n');
    } catch (error) {
      console.warn(`Warning: Could not create .gitkeep in ${dir}`);
    }
  }
  
  console.log('\n✓ All upload directories have been created successfully!');
  console.log('\nDirectory structure:');
  directories.forEach(dir => console.log(`  ${dir}/`));
}

async function createHtaccessFile() {
  const htaccessContent = `# Protect upload directories
# Allow access to files but prevent directory listing

Options -Indexes

# Allow common file types
<FilesMatch "\\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|webp|zip|rar|7z)$">
    Order allow,deny
    Allow from all
</FilesMatch>

# Block potentially dangerous files
<FilesMatch "\\.(php|php3|php4|php5|phtml|pl|py|jsp|asp|sh|cgi)$">
    Order deny,allow
    Deny from all
</FilesMatch>

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache control for uploaded files
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 year"
    ExpiresByType application/msword "access plus 1 year"
    ExpiresByType application/vnd.openxmlformats-officedocument.wordprocessingml.document "access plus 1 year"
</IfModule>`;

  const htaccessPath = path.join(process.cwd(), 'public', 'uploads', '.htaccess');
  
  try {
    await fs.writeFile(htaccessPath, htaccessContent);
    console.log('✓ Created .htaccess file for upload security');
  } catch (error) {
    console.warn('Warning: Could not create .htaccess file:', error);
  }
}

async function setupStorage() {
  try {
    console.log('🚀 Setting up local file storage for cPanel hosting...\n');
    
    await createUploadDirectories();
    await createHtaccessFile();
    
    console.log('\n🎉 Storage setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Your files will now be stored locally in ./public/uploads/');
    console.log('2. When deploying to cPanel:');
    console.log('   - Upload the entire project to your domain folder');
    console.log('   - Ensure the uploads directory has write permissions (755 or 777)');
    console.log('   - The files will be accessible at https://gjadt.vercel.app/uploads/...');
    console.log('');
    console.log('3. The system is now ready to use!');
    console.log('4. To migrate existing Cloudinary files, update the migration script');
    
  } catch (error) {
    console.error('❌ Storage setup failed:', error);
    throw error;
  }
}

// Run setup
setupStorage()
  .then(() => {
    console.log('\n✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
