import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    console.log('=== CLOUDINARY CONFIGURATION TEST ===');
    console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API key exists:', !!process.env.CLOUDINARY_API_KEY);
    console.log('API secret exists:', !!process.env.CLOUDINARY_API_SECRET);

    // Test basic connection first
    console.log('Testing basic Cloudinary connection...');
    
    // Try to get account info (simplest test)
    const accountInfo = await cloudinary.api.ping();
    console.log('Cloudinary ping successful:', accountInfo);

    // Get ALL files with pagination to see the complete structure
    console.log('Searching for ALL files in account...');
    const allFiles = await cloudinary.search
      .max_results(100)
      .execute();
    
    console.log('Total files in account:', allFiles.total_count);
    console.log('Files retrieved:', allFiles.resources.length);

    // Try different search patterns for manuscripts
    const manuscriptFiles = await cloudinary.search
      .expression('folder:manuscripts/*')
      .max_results(50)
      .execute();

    const manuscriptSubfolderFiles = await cloudinary.search
      .expression('folder:manuscripts/manuscripts/*')
      .max_results(50)
      .execute();

    // Also try to get folder structure
    let folders = [];
    try {
      const folderResult = await cloudinary.api.sub_folders('');
      folders = folderResult.folders;
    } catch (folderError) {
      console.log('Could not retrieve folders:', folderError);
    }

    console.log('Files in manuscripts folder:', manuscriptFiles.total_count);
    console.log('Files in manuscripts/manuscripts folder:', manuscriptSubfolderFiles.total_count);
    console.log('Folders found:', folders);

    return NextResponse.json({
      success: true,
      account_ping: accountInfo,
      total_files_in_account: allFiles.total_count,
      folders: folders,
      all_files: allFiles.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        created_at: resource.created_at,
        resource_type: resource.resource_type,
        format: resource.format,
        folder: resource.folder,
      })),
      manuscripts_folder_count: manuscriptFiles.total_count,
      manuscripts_files: manuscriptFiles.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        created_at: resource.created_at,
        resource_type: resource.resource_type,
        format: resource.format,
        folder: resource.folder,
      })),
      manuscripts_subfolder_count: manuscriptSubfolderFiles.total_count,
      manuscripts_subfolder_files: manuscriptSubfolderFiles.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        created_at: resource.created_at,
        resource_type: resource.resource_type,
        format: resource.format,
        folder: resource.folder,
      })),
    });
  } catch (error: any) {
    console.error('=== CLOUDINARY ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error status:', error.http_code);
    
    return NextResponse.json(
      { 
        error: 'Cloudinary test failed', 
        details: error.message,
        error_code: error.http_code,
        config_check: {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key_exists: !!process.env.CLOUDINARY_API_KEY,
          api_secret_exists: !!process.env.CLOUDINARY_API_SECRET,
        }
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Test upload with a simple text file
    const testContent = 'This is a test file for Cloudinary connection.';
    const buffer = Buffer.from(testContent, 'utf8');

    console.log('Testing Cloudinary upload...');

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'manuscripts',
          resource_type: 'raw',
          public_id: `test-upload-${Date.now()}`,
          access_mode: 'public',
        },
        (error, result) => {
          if (error) {
            console.error('Upload error:', error);
            reject(error);
          } else {
            console.log('Upload success:', result);
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: 'Test upload successful',
      result: uploadResult,
    });
  } catch (error: any) {
    console.error('Test upload failed:', error);
    return NextResponse.json(
      { error: 'Test upload failed', details: error.message },
      { status: 500 }
    );
  }
}
