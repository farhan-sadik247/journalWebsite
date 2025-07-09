/**
 * Migration script to move files from Cloudinary to local storage
 * 
 * This script will:
 * 1. Download all files from Cloudinary
 * 2. Save them to local storage
 * 3. Update database records with new URLs
 * 
 * Run this script after setting up your new storage system
 */

import dbConnect from '../lib/mongodb';
import Manuscript from '../models/Manuscript';
import Review from '../models/Review';
import UserManual from '../models/UserManual';
import { uploadToStorage } from '../lib/storage';
import { promises as fs } from 'fs';
import path from 'path';

interface FileToMigrate {
  cloudinaryId: string;
  cloudinaryUrl: string;
  collection: string;
  documentId: string;
  fieldPath: string;
}

async function downloadFromCloudinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractFilesFromManuscripts(): Promise<FileToMigrate[]> {
  const manuscripts = await Manuscript.find({
    $or: [
      { 'files.cloudinaryId': { $exists: true, $ne: null } },
      { 'galleyProofs.cloudinaryId': { $exists: true, $ne: null } },
      { 'revisions.files.cloudinaryId': { $exists: true, $ne: null } }
    ]
  });

  const filesToMigrate: FileToMigrate[] = [];

  for (const manuscript of manuscripts) {
    // Main manuscript files
    if (manuscript.files && Array.isArray(manuscript.files)) {
      manuscript.files.forEach((file: any, index: number) => {
        if (file.cloudinaryId && file.url) {
          filesToMigrate.push({
            cloudinaryId: file.cloudinaryId,
            cloudinaryUrl: file.url,
            collection: 'manuscripts',
            documentId: manuscript._id.toString(),
            fieldPath: `files.${index}`
          });
        }
      });
    }

    // Galley proofs
    if (manuscript.galleyProofs && Array.isArray(manuscript.galleyProofs)) {
      manuscript.galleyProofs.forEach((file: any, index: number) => {
        if (file.cloudinaryId && file.url) {
          filesToMigrate.push({
            cloudinaryId: file.cloudinaryId,
            cloudinaryUrl: file.url,
            collection: 'manuscripts',
            documentId: manuscript._id.toString(),
            fieldPath: `galleyProofs.${index}`
          });
        }
      });
    }

    // Revision files
    if (manuscript.revisions && Array.isArray(manuscript.revisions)) {
      manuscript.revisions.forEach((revision: any, revisionIndex: number) => {
        if (revision.files && Array.isArray(revision.files)) {
          revision.files.forEach((file: any, fileIndex: number) => {
            if (file.cloudinaryId && file.url) {
              filesToMigrate.push({
                cloudinaryId: file.cloudinaryId,
                cloudinaryUrl: file.url,
                collection: 'manuscripts',
                documentId: manuscript._id.toString(),
                fieldPath: `revisions.${revisionIndex}.files.${fileIndex}`
              });
            }
          });
        }
      });
    }
  }

  return filesToMigrate;
}

async function extractFilesFromReviews(): Promise<FileToMigrate[]> {
  const reviews = await Review.find({
    'cloudinaryId': { $exists: true, $ne: null }
  });

  return reviews.map(review => ({
    cloudinaryId: review.cloudinaryId,
    cloudinaryUrl: review.fileUrl || '',
    collection: 'reviews',
    documentId: review._id.toString(),
    fieldPath: 'cloudinaryId'
  }));
}

async function extractFilesFromUserManuals(): Promise<FileToMigrate[]> {
  const userManuals = await UserManual.find({
    'imageUrl': { $regex: /cloudinary/ }
  });

  return userManuals.map(manual => ({
    cloudinaryId: manual.imageUrl.split('/').pop() || '',
    cloudinaryUrl: manual.imageUrl,
    collection: 'usermanuals',
    documentId: manual._id.toString(),
    fieldPath: 'imageUrl'
  }));
}

async function migrateFile(fileToMigrate: FileToMigrate): Promise<string> {
  try {
    console.log(`Migrating file: ${fileToMigrate.cloudinaryId}`);
    
    // Download file from Cloudinary
    const buffer = await downloadFromCloudinary(fileToMigrate.cloudinaryUrl);
    
    // Extract original filename from Cloudinary URL or use cloudinaryId
    const urlParts = fileToMigrate.cloudinaryUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || fileToMigrate.cloudinaryId;
    
    // Determine folder based on collection
    let folder = 'general';
    if (fileToMigrate.collection === 'manuscripts') {
      if (fileToMigrate.fieldPath.includes('galley')) {
        folder = 'galley-proofs';
      } else if (fileToMigrate.fieldPath.includes('revision')) {
        folder = 'revisions';
      } else {
        folder = 'manuscripts';
      }
    } else if (fileToMigrate.collection === 'reviews') {
      folder = 'reviews';
    } else if (fileToMigrate.collection === 'usermanuals') {
      folder = 'user-manuals';
    }

    // Upload using standard storage function
    const uploadResult = await uploadToStorage(buffer, filename, folder);
    
    console.log(`Successfully migrated: ${fileToMigrate.cloudinaryId} -> ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
    
  } catch (error) {
    console.error(`Failed to migrate file ${fileToMigrate.cloudinaryId}:`, error);
    throw error;
  }
}

async function updateDatabaseRecord(fileToMigrate: FileToMigrate, newUrl: string, newId: string) {
  const { collection, documentId, fieldPath } = fileToMigrate;
  
  try {
    let Model;
    switch (collection) {
      case 'manuscripts':
        Model = Manuscript;
        break;
      case 'reviews':
        Model = Review;
        break;
      case 'usermanuals':
        Model = UserManual;
        break;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }

    // Update the database record
    const updatePath = fieldPath.replace(/(\.\d+)/g, '.$[$1]');
    const updateQuery: any = {};
    
    if (fieldPath.includes('files') || fieldPath.includes('galleyProofs')) {
      // For file arrays, update both url and cloudinaryId
      updateQuery[`${fieldPath}.url`] = newUrl;
      updateQuery[`${fieldPath}.cloudinaryId`] = newId;
    } else if (collection === 'reviews') {
      updateQuery['fileUrl'] = newUrl;
      updateQuery['cloudinaryId'] = newId;
    } else if (collection === 'usermanuals') {
      updateQuery['imageUrl'] = newUrl;
    }

    await Model.findByIdAndUpdate(documentId, { $set: updateQuery });
    console.log(`Updated database record: ${collection}/${documentId}/${fieldPath}`);
    
  } catch (error) {
    console.error(`Failed to update database record:`, error);
    throw error;
  }
}

async function migratecloudinaryToLocal() {
  try {
    console.log('Starting migration from Cloudinary to local storage...');
    
    await dbConnect();
    
    // Extract all files to migrate
    console.log('Extracting files from database...');
    const manuscriptFiles = await extractFilesFromManuscripts();
    const reviewFiles = await extractFilesFromReviews();
    const userManualFiles = await extractFilesFromUserManuals();
    
    const allFiles = [...manuscriptFiles, ...reviewFiles, ...userManualFiles];
    console.log(`Found ${allFiles.length} files to migrate`);
    
    // Create backup of database before migration
    console.log('Creating backup log...');
    const backupLog = {
      timestamp: new Date().toISOString(),
      totalFiles: allFiles.length,
      files: allFiles
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'migration-backup.json'),
      JSON.stringify(backupLog, null, 2)
    );
    
    // Migrate files
    let successCount = 0;
    let errorCount = 0;
    
    for (const fileToMigrate of allFiles) {
      try {
        const newUrl = await migrateFile(fileToMigrate);
        const newId = newUrl.split('/uploads/')[1]; // Extract relative path as ID
        
        await updateDatabaseRecord(fileToMigrate, newUrl, newId);
        successCount++;
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to migrate file:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration completed!`);
    console.log(`Successfully migrated: ${successCount} files`);
    console.log(`Failed migrations: ${errorCount} files`);
    
    // Save migration results
    const migrationResults = {
      timestamp: new Date().toISOString(),
      totalFiles: allFiles.length,
      successCount,
      errorCount,
      completed: true
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'migration-results.json'),
      JSON.stringify(migrationResults, null, 2)
    );
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratecloudinaryToLocal()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default migratecloudinaryToLocal;
