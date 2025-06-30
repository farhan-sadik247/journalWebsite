import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

// POST /api/manuscripts/[id]/copy-edit-files - Upload copy editing working files
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a copy editor or admin
    if (!session.user.roles?.includes('copy-editor') && 
        session.user.role !== 'copy-editor' && 
        !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const workingFiles = formData.getAll('workingFiles') as File[];

    if (!workingFiles || workingFiles.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    await dbConnect();

    // Verify manuscript exists
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if copy editor is assigned to this manuscript (unless admin)
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    if (isCopyEditor && !isAdmin) {
      if (!manuscript.assignedCopyEditor || manuscript.assignedCopyEditor.toString() !== session.user.id) {
        return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
      }
    }

    // Upload files to Cloudinary
    const uploadedFiles = [];
    const { v2: cloudinary } = await import('cloudinary');

    for (const file of workingFiles) {
      if (file.size > 0) {
        try {
          // Convert file to buffer
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Upload to Cloudinary
          const uploadResult: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                resource_type: 'raw',
                folder: 'copy-edit-working-files',
                public_id: `${params.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(buffer);
          });

          if (uploadResult && uploadResult.public_id) {
            uploadedFiles.push({
              originalName: file.name,
              filename: uploadResult.public_id,
              url: uploadResult.secure_url || uploadResult.url,
              size: file.size,
              type: file.type,
              uploadedBy: session.user.name || session.user.email,
              uploadedAt: new Date(),
            });
          }
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // Continue with other files even if one fails
        }
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Failed to upload any files' }, { status: 500 });
    }

    // Update manuscript with new working files
    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      {
        $push: {
          copyEditWorkingFiles: { $each: uploadedFiles },
          timeline: {
            event: 'copy-edit-files-uploaded',
            description: `Copy editor uploaded ${uploadedFiles.length} working file(s)`,
            performedBy: session.user.id,
            metadata: {
              fileCount: uploadedFiles.length,
              fileNames: uploadedFiles.map(f => f.originalName)
            },
            date: new Date()
          }
        },
        lastModified: new Date()
      },
      { new: true }
    ).populate('submittedBy assignedCopyEditor', 'name email');

    return NextResponse.json({
      message: `Successfully uploaded ${uploadedFiles.length} working file(s)`,
      manuscript: updatedManuscript,
      uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading copy editing working files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/copy-edit-files/[filename] - Download working file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; filename?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Verify manuscript exists and user has access
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user has permission to download
    const isAuthor = manuscript.submittedBy.toString() === session.user.id;
    const isCopyEditor = session.user.roles?.includes('copy-editor') || session.user.role === 'copy-editor';
    const isEditor = session.user.roles?.includes('editor') || session.user.role === 'editor';
    const isAdmin = session.user.roles?.includes('admin');

    if (!isAuthor && !isCopyEditor && !isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // If no specific filename, return list of files
    if (!request.url.includes('/copy-edit-files/')) {
      return NextResponse.json({
        files: manuscript.copyEditWorkingFiles || []
      });
    }

    // Extract filename from URL
    const filename = request.url.split('/copy-edit-files/')[1];
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Find the file
    const file = manuscript.copyEditWorkingFiles?.find((f: any) => f.filename === filename);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Redirect to Cloudinary URL
    return NextResponse.redirect(file.url);

  } catch (error) {
    console.error('Error downloading copy editing working file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
