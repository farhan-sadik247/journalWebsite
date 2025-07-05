import { NextResponse } from 'next/server';
import { cpanelStorage } from '@/lib/storage';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    console.log('=== LISTING ALL LOCAL MANUSCRIPT FILES ===');
    
    // Get all files in the manuscripts folder
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'manuscripts');
    
    try {
      const files = await cpanelStorage.listFiles('manuscripts');
      console.log(`Found ${files.length} files in manuscripts folder`);

      const fileDetails = await Promise.all(
        files.map(async (fileName: string) => {
          try {
            const filePath = path.join(uploadsDir, fileName);
            const stats = await fs.stat(filePath);
            
            return {
              public_id: `manuscripts/${fileName}`,
              secure_url: `${process.env.DOMAIN_BASE_URL || 'http://localhost:3000'}/uploads/manuscripts/${fileName}`,
              created_at: stats.birthtime,
              modified_at: stats.mtime,
              bytes: stats.size,
              original_filename: fileName,
              display_name: fileName,
              folder: 'manuscripts',
            };
          } catch (error) {
            console.error(`Error getting stats for file ${fileName}:`, error);
            return null;
          }
        })
      );

      const validFiles = fileDetails.filter(file => file !== null);

      // Log each file for debugging
      validFiles.forEach((file: any, index: number) => {
        console.log(`File ${index + 1}:`, {
          public_id: file.public_id,
          url: file.secure_url,
          bytes: file.bytes,
        });
      });

      return NextResponse.json({
        success: true,
        total_count: validFiles.length,
        files: validFiles,
        message: 'Files listed successfully from local storage',
        local_storage_info: {
          uploads_directory: uploadsDir,
          base_url: process.env.DOMAIN_BASE_URL || 'http://localhost:3000',
          note: 'Files are now stored locally instead of Cloudinary'
        }
      });
    } catch (error) {
      console.error('Error listing files:', error);
      return NextResponse.json({
        success: false,
        total_count: 0,
        files: [],
        error: 'No manuscripts folder found or error reading files'
      });
    }
  } catch (error) {
    console.error('Error in list-manuscripts API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
