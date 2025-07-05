# Local File Storage Setup

This project now uses local file storage instead of Cloudinary for all uploaded files.

## Directory Structure

All uploaded files are stored in the `public/uploads/` directory:

```
public/
├── uploads/
│   ├── categories/           # Category images
│   ├── user-manual/         # User manual images
│   ├── manuscripts/         # Manuscript files (PDF, DOC, DOCX)
│   ├── cover-images/        # Cover images for publications
│   ├── galley-proofs/       # Galley proof files
│   ├── reviews/             # Review documents
│   ├── revisions/           # Manuscript revisions
│   ├── profile-images/      # User profile images
│   └── general/             # General purpose uploads
```

## File Naming Convention

Files are automatically renamed with a timestamp and random string to avoid conflicts:
- Format: `{original-name}-{timestamp}-{random-string}.{extension}`
- Example: `research-paper-1704545600000-abc123.pdf`

## File Access

Files are directly accessible via URL:
- Format: `{BASE_URL}/uploads/{folder}/{filename}`
- Example: `http://localhost:3000/uploads/categories/science-1704545600000-abc123.jpg`

## Storage Utility

The centralized storage utility is located in `src/lib/storage.ts` and provides:
- `uploadToStorage(buffer, filename, folder)` - Upload file to local storage
- `deleteFromStorage(publicId)` - Delete file from local storage
- File existence checking
- File size management

## Environment Variables

Update your `.env.local` file to remove Cloudinary variables and ensure:
- `DOMAIN_BASE_URL` - Base URL for file access (e.g., `http://localhost:3000`)
- `UPLOADS_DIR` - Optional custom uploads directory path

## Migration Note

If you have existing files on Cloudinary, you can use the migration script:
`npm run migrate-cloudinary-to-local`

This will download all existing files from Cloudinary and update database references.
