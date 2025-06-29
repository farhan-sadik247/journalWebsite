import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    console.log('=== LISTING ALL MANUSCRIPT FILES ===');
    
    // Get all files in the manuscripts folder
    const result = await cloudinary.search
      .expression('folder:manuscripts')
      .sort_by('uploaded_at', 'desc')
      .max_results(50)
      .execute();

    console.log(`Found ${result.total_count} files in manuscripts folder`);

    const files = result.resources.map((resource: any) => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      url: resource.url,
      created_at: resource.created_at,
      resource_type: resource.resource_type,
      format: resource.format,
      bytes: resource.bytes,
      original_filename: resource.original_filename,
      display_name: resource.display_name,
      folder: resource.folder,
      access_mode: resource.access_mode,
    }));

    // Log each file for debugging
    files.forEach((file: any, index: number) => {
      console.log(`File ${index + 1}:`, {
        public_id: file.public_id,
        url: file.secure_url,
        resource_type: file.resource_type,
        format: file.format,
      });
    });

    return NextResponse.json({
      success: true,
      total_count: result.total_count,
      files: files,
      cloudinary_dashboard_urls: {
        main_dashboard: `https://console.cloudinary.com/console/${process.env.CLOUDINARY_CLOUD_NAME}/media_library`,
        manuscripts_folder: `https://console.cloudinary.com/console/${process.env.CLOUDINARY_CLOUD_NAME}/media_library/folders/manuscripts`,
        raw_files: `https://console.cloudinary.com/console/${process.env.CLOUDINARY_CLOUD_NAME}/media_library/search?resource_type=raw`,
      },
      instructions: {
        how_to_view_in_dashboard: [
          "1. Go to your Cloudinary console",
          "2. Click on 'Media Library' in the left sidebar",
          "3. Look for the 'manuscripts' folder and click on it",
          "4. If you don't see it, try clicking on 'Raw' tab at the top (PDFs are stored as raw files)",
          "5. You can also search for 'manuscripts' in the search box",
        ],
        direct_links: "Use the cloudinary_dashboard_urls above to go directly to the right section",
      }
    });
  } catch (error: any) {
    console.error('Error listing manuscripts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list manuscripts', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
