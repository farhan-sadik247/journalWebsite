import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
  format: string;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'manuscripts'
): Promise<CloudinaryUploadResult> {
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary configuration missing. Please check environment variables.');
    throw new Error('File upload service not configured');
  }

  // Create a clean filename without path and extension for public_id
  const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const timestamp = Date.now();
  const publicId = `${cleanFilename}-${timestamp}`;

  console.log(`Uploading file: ${filename} to folder: ${folder} with public_id: ${publicId}`);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: filename.toLowerCase().endsWith('.pdf') ? 'raw' : 'auto',
        public_id: publicId, // Clean public_id without folder prefix
        use_filename: false, // Don't use original filename
        unique_filename: false,
        type: 'upload', // Ensure it's uploaded as a public file
        access_mode: 'public', // Make the file publicly accessible
        overwrite: false, // Don't overwrite existing files
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          console.log('Cloudinary upload success:', result.public_id);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            original_filename: result.original_filename || filename,
            bytes: result.bytes,
            format: result.format,
          });
        } else {
          reject(new Error('Upload failed - no result'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

export function generateSignedUrl(publicId: string, expiresIn: number = 3600): string {
  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  });
}

export default cloudinary; 