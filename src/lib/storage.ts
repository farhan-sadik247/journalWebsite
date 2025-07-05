import path from 'path';
import { promises as fs } from 'fs';
import { mkdir } from 'fs/promises';

export interface StorageUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
  format: string;
  file_path: string;
}

export class CpanelStorage {
  private baseUrl = process.env.DOMAIN_BASE_URL || 'https://gjadt.org';
  private uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await mkdir(this.uploadsDir, { recursive: true });
    }
  }

  private generateUniqueFilename(originalFilename: string, folder: string = ''): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalFilename);
    const basename = path.basename(originalFilename, extension);
    const cleanBasename = basename.replace(/[^a-zA-Z0-9-_]/g, "_");
    
    return `${cleanBasename}-${timestamp}-${randomString}${extension}`;
  }

  private getFilePath(filename: string, folder: string = ''): string {
    const folderPath = folder ? folder : 'general';
    return path.join(this.uploadsDir, folderPath, filename);
  }

  private getPublicUrl(filename: string, folder: string = ''): string {
    const folderPath = folder ? `/${folder}` : '/general';
    return `${this.baseUrl}/uploads${folderPath}/${filename}`;
  }

  async uploadFile(
    buffer: Buffer,
    originalFilename: string,
    folder: string = 'uploads'
  ): Promise<StorageUploadResult> {
    try {
      // Generate unique filename
      const uniqueFilename = this.generateUniqueFilename(originalFilename, folder);
      const filePath = this.getFilePath(uniqueFilename, folder);
      
      // Ensure folder exists
      const folderPath = path.dirname(filePath);
      await mkdir(folderPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);
      
      const result: StorageUploadResult = {
        public_id: `${folder}/${uniqueFilename}`,
        secure_url: this.getPublicUrl(uniqueFilename, folder),
        original_filename: originalFilename,
        bytes: buffer.length,
        format: path.extname(originalFilename).substring(1),
        file_path: filePath,
      };

      console.log('File uploaded successfully:', result.secure_url);
      return result;

    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      // Convert public_id back to file path
      const relativePath = publicId.replace(/^\/+/, ''); // Remove leading slashes
      const filePath = path.join(this.uploadsDir, relativePath);
      
      await fs.unlink(filePath);
      console.log('File deleted successfully:', filePath);
      
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listFiles(folder: string = ''): Promise<string[]> {
    try {
      const folderPath = folder ? path.join(this.uploadsDir, folder) : this.uploadsDir;
      const files = await fs.readdir(folderPath);
      
      // Filter out directories, return only files
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(folderPath, file);
          const stat = await fs.stat(filePath);
          return { name: file, isFile: stat.isFile() };
        })
      );
      
      return fileStats
        .filter(file => file.isFile)
        .map(file => file.name);
        
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Method to check if file exists
  async fileExists(publicId: string): Promise<boolean> {
    try {
      const relativePath = publicId.replace(/^\/+/, '');
      const filePath = path.join(this.uploadsDir, relativePath);
      
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Method to get file size
  async getFileSize(publicId: string): Promise<number> {
    try {
      const relativePath = publicId.replace(/^\/+/, '');
      const filePath = path.join(this.uploadsDir, relativePath);
      
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }
}

// Create a singleton instance
export const cpanelStorage = new CpanelStorage();

// Legacy compatibility functions to replace Cloudinary functions
export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  folder: string = 'manuscripts'
): Promise<StorageUploadResult> {
  return await cpanelStorage.uploadFile(buffer, filename, folder);
}

export async function deleteFromStorage(publicId: string): Promise<void> {
  await cpanelStorage.deleteFile(publicId);
}

export function generateSecureUrl(publicId: string): string {
  // For local/cPanel hosting, files are directly accessible via URL
  const baseUrl = process.env.DOMAIN_BASE_URL || 'https://gjadt.org';
  const cleanId = publicId.replace(/^\/+/, '');
  return `${baseUrl}/uploads/${cleanId}`;
}

export default cpanelStorage;
