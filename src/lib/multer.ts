import path from 'path';
import { mkdir } from 'fs/promises';
import { uploadToStorage, StorageUploadResult } from './storage';

// Helper function to process multipart form data in Next.js
export const processFormData = async (
  formData: FormData,
  destinationFolder: string = 'uploads'
): Promise<{ files: StorageUploadResult[]; fields: Record<string, any> }> => {
  const files: StorageUploadResult[] = [];
  const fields: Record<string, any> = {};

  // Process all form data entries
  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (value instanceof File) {
      // Handle file upload
      if (value.size > 0) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const uploadResult = await uploadToStorage(buffer, value.name, destinationFolder);
        files.push(uploadResult);
      }
    } else {
      // Handle regular form fields
      fields[key] = value;
    }
  }

  return { files, fields };
};

// Validate file types
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Validate file size
export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Generate public URL for uploaded file
export const generatePublicUrl = (filename: string, folder: string = 'uploads'): string => {
  const baseUrl = process.env.DOMAIN_BASE_URL || 'https://gjadt.org';
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

// File type constants
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
];

// Helper to create upload directories
export const ensureUploadDirectory = async (folder: string): Promise<string> => {
  const uploadPath = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(uploadPath, { recursive: true });
  return uploadPath;
};
