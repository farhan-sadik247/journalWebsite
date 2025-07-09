import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function GET() {
  try {
    console.log('=== LISTING ALL MANUSCRIPT FILES FROM CLOUDINARY ===');
    
    // Get all files in the manuscripts folder from Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.api.resources(
        { type: 'upload', prefix: 'manuscripts', max_results: 500 },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    const files = (result as any).resources;
    console.log(`Found ${files.length} files in manuscripts folder`);

    const fileDetails = files.map((file: any) => ({
      public_id: file.public_id,
      secure_url: file.secure_url,
      created_at: new Date(file.created_at),
      bytes: file.bytes,
      original_filename: file.original_filename || file.public_id.split('/').pop(),
      display_name: file.original_filename || file.public_id.split('/').pop(),
      folder: 'manuscripts',
    }));

    // Log each file for debugging
    fileDetails.forEach((file: any, index: number) => {
      console.log(`File ${index + 1}:`, {
        public_id: file.public_id,
        url: file.secure_url,
        bytes: file.bytes,
      });
    });

    return NextResponse.json({
      success: true,
      total_count: fileDetails.length,
      files: fileDetails,
      message: 'Files listed successfully from Cloudinary'
    });
    
  } catch (error) {
    console.error('Error in list-manuscripts API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
