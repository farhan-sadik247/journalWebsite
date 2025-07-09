import cloudinary from './cloudinary';
import { UploadApiResponse } from 'cloudinary';

export interface StorageUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
  format: string;
}

export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  folder: string = 'manuscripts'
): Promise<StorageUploadResult> {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          filename_override: filename,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
            return;
          }
          if (!result) {
            reject(new Error('No result from Cloudinary'));
            return;
          }
          
          const uploadResult: StorageUploadResult = {
            public_id: result.public_id,
            secure_url: result.secure_url,
            original_filename: filename,
            bytes: result.bytes,
            format: result.format
          };
          
          resolve(uploadResult);
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteFromStorage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateSecureUrl(publicId: string): string {
  return cloudinary.url(publicId, { secure: true });
}

export default {
  uploadToStorage,
  deleteFromStorage,
  generateSecureUrl
};
