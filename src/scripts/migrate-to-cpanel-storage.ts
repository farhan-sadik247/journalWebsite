/**
 * Migration script to transfer files from Cloudinary to cPanel storage
 * 
 * This script will:
 * 1. Fetch all manuscripts and their associated files from the database
 * 2. Download files from Cloudinary
 * 3. Upload them to your cPanel storage
 * 4. Update the database with new URLs
 * 
 * IMPORTANT: Run this script after setting up your FTP credentials in .env.local
 */

import dbConnect from '../lib/mongodb';
import Manuscript from '../models/Manuscript';
import Review from '../models/Review';
import { cpanelStorage } from '../lib/storage';
import { v2 as cloudinary } from 'cloudinary';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configure Cloudinary (for downloading files)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface MigrationResult {
  totalFiles: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: string[];
}

async function downloadFileFromUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function migrateFile(
  cloudinaryUrl: string, 
  publicId: string, 
  originalFilename: string,
  folder: string = 'manuscripts'
): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  try {
    console.log(`Migrating file: ${originalFilename} from ${cloudinaryUrl}`);
    
    // Download file from Cloudinary
    const buffer = await downloadFileFromUrl(cloudinaryUrl);
    
    // Upload to cPanel storage
    const result = await cpanelStorage.uploadFile(buffer, originalFilename, folder);
    
    console.log(`✓ Successfully migrated: ${originalFilename} to ${result.secure_url}`);
    return { success: true, newUrl: result.secure_url };
    
  } catch (error) {
    const errorMessage = `Failed to migrate ${originalFilename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`✗ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function migrateManuscriptFiles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalFiles: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    errors: []
  };

  try {
    await dbConnect();
    
    // Get all manuscripts with files
    const manuscripts = await Manuscript.find({
      $or: [
        { 'files.0': { $exists: true } },
        { 'revisions.files.0': { $exists: true } },
        { 'galleyProofs.0': { $exists: true } }
      ]
    });
    
    console.log(`Found ${manuscripts.length} manuscripts with files to migrate`);
    
    for (const manuscript of manuscripts) {
      console.log(`\nProcessing manuscript: ${manuscript.title} (${manuscript._id})`);
      
      // Migrate main manuscript files
      if (manuscript.files && manuscript.files.length > 0) {
        for (let i = 0; i < manuscript.files.length; i++) {
          const file = manuscript.files[i];
          if (file.url && file.url.includes('cloudinary')) {
            result.totalFiles++;
            const migration = await migrateFile(file.url, file.cloudinaryId, file.originalName, 'manuscripts');
            
            if (migration.success && migration.newUrl) {
              // Update the file URL in the database
              manuscript.files[i].url = migration.newUrl;
              result.successfulMigrations++;
            } else {
              result.failedMigrations++;
              if (migration.error) result.errors.push(migration.error);
            }
          }
        }
      }
      
      // Migrate revision files
      if (manuscript.revisions && manuscript.revisions.length > 0) {
        for (const revision of manuscript.revisions) {
          if (revision.files && revision.files.length > 0) {
            for (let i = 0; i < revision.files.length; i++) {
              const file = revision.files[i];
              if (file.url && file.url.includes('cloudinary')) {
                result.totalFiles++;
                const migration = await migrateFile(file.url, file.cloudinaryId, file.originalName, `manuscripts/${manuscript._id}/revisions`);
                
                if (migration.success && migration.newUrl) {
                  revision.files[i].url = migration.newUrl;
                  result.successfulMigrations++;
                } else {
                  result.failedMigrations++;
                  if (migration.error) result.errors.push(migration.error);
                }
              }
            }
          }
        }
      }
      
      // Migrate galley proof files
      if (manuscript.galleyProofs && manuscript.galleyProofs.length > 0) {
        for (let i = 0; i < manuscript.galleyProofs.length; i++) {
          const galley = manuscript.galleyProofs[i];
          if (galley.url && galley.url.includes('cloudinary')) {
            result.totalFiles++;
            const migration = await migrateFile(galley.url, galley.cloudinaryId, galley.originalName, `manuscripts/${manuscript._id}/galley-proofs`);
            
            if (migration.success && migration.newUrl) {
              manuscript.galleyProofs[i].url = migration.newUrl;
              result.successfulMigrations++;
            } else {
              result.failedMigrations++;
              if (migration.error) result.errors.push(migration.error);
            }
          }
        }
      }
      
      // Save the updated manuscript
      await manuscript.save();
      console.log(`✓ Updated manuscript ${manuscript._id} in database`);
    }
    
  } catch (error) {
    const errorMessage = `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
  }
  
  return result;
}

async function migrateReviewFiles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalFiles: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    errors: []
  };

  try {
    // Get all reviews with files
    const reviews = await Review.find({
      'files.0': { $exists: true }
    });
    
    console.log(`\nFound ${reviews.length} reviews with files to migrate`);
    
    for (const review of reviews) {
      console.log(`Processing review: ${review._id}`);
      
      if (review.files && review.files.length > 0) {
        for (let i = 0; i < review.files.length; i++) {
          const file = review.files[i];
          if (file.url && file.url.includes('cloudinary')) {
            result.totalFiles++;
            const migration = await migrateFile(file.url, file.cloudinaryId, file.originalName, 'reviews');
            
            if (migration.success && migration.newUrl) {
              review.files[i].url = migration.newUrl;
              result.successfulMigrations++;
            } else {
              result.failedMigrations++;
              if (migration.error) result.errors.push(migration.error);
            }
          }
        }
        
        // Save the updated review
        await review.save();
        console.log(`✓ Updated review ${review._id} in database`);
      }
    }
    
  } catch (error) {
    const errorMessage = `Review migration error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
  }
  
  return result;
}

async function runMigration() {
  console.log('🚀 Starting file migration from Cloudinary to cPanel storage...\n');
  
  // Check if FTP credentials are configured
  if (!process.env.FTP_HOST || !process.env.FTP_USER || !process.env.FTP_PASSWORD) {
    console.error('❌ FTP credentials not configured. Please update your .env.local file with:');
    console.error('- FTP_HOST=ftp.gjadt.org');
    console.error('- FTP_USER=your-ftp-username');
    console.error('- FTP_PASSWORD=your-ftp-password');
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  // Migrate manuscript files
  console.log('📄 Migrating manuscript files...');
  const manuscriptResults = await migrateManuscriptFiles();
  
  // Migrate review files
  console.log('\n📝 Migrating review files...');
  const reviewResults = await migrateReviewFiles();
  
  // Combine results
  const totalResults: MigrationResult = {
    totalFiles: manuscriptResults.totalFiles + reviewResults.totalFiles,
    successfulMigrations: manuscriptResults.successfulMigrations + reviewResults.successfulMigrations,
    failedMigrations: manuscriptResults.failedMigrations + reviewResults.failedMigrations,
    errors: [...manuscriptResults.errors, ...reviewResults.errors]
  };
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${totalResults.totalFiles}`);
  console.log(`✅ Successful migrations: ${totalResults.successfulMigrations}`);
  console.log(`❌ Failed migrations: ${totalResults.failedMigrations}`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  
  if (totalResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    totalResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  if (totalResults.successfulMigrations === totalResults.totalFiles) {
    console.log('\n🎉 Migration completed successfully! All files have been transferred to your cPanel storage.');
    console.log('💡 You can now remove the Cloudinary configuration from your .env.local file.');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Please review the failed migrations above.');
  }
  
  process.exit(0);
}

// Run the migration
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}
