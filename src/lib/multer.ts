import { uploadToStorage, StorageUploadResult } from './storage';

export const parseMultipartForm = async (
  formData: FormData,
  destinationFolder: string = 'uploads'
): Promise<{ files: StorageUploadResult[]; fields: Record<string, any> }> => {
  const files: StorageUploadResult[] = [];
  const fields: Record<string, any> = {};

  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (value instanceof File) {
      // Handle file upload
      const buffer = Buffer.from(await value.arrayBuffer());
      const uploadResult = await uploadToStorage(buffer, value.name, destinationFolder);
      files.push(uploadResult);
      fields[key] = uploadResult.secure_url;
    } else {
      fields[key] = value;
    }
  }

  return { files, fields };
};

// Generate Cloudinary URL
export const generatePublicUrl = (publicId: string): string => {
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
};

export default {
  parseMultipartForm,
  generatePublicUrl
};
