import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { uploadToStorage } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is authorized (author or submitter)
    const isAuthor = manuscript.authors.some((author: any) => 
      author.email === session.user.email
    );
    const isSubmitter = manuscript.submittedBy._id.toString() === session.user.id;

    if (!isAuthor && !isSubmitter) {
      return NextResponse.json({ error: 'Not authorized to upload files for this manuscript' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles = [];
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: `File ${file.name} is not supported. Please upload PDF, DOC, DOCX, or TXT files.` 
        }, { status: 400 });
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 10MB.` 
        }, { status: 400 });
      }

      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to local storage
        const uploadResult = await uploadToStorage(buffer, file.name, `manuscripts/${manuscript._id}/author-review`);

        uploadedFiles.push({
          originalName: file.name,
          filename: uploadResult.public_id,
          url: uploadResult.secure_url,
          type: 'author-review-file',
          uploadedBy: session.user.id,
          uploadedAt: new Date(),
          size: file.size,
          mimeType: file.type,
        });

      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return NextResponse.json({ 
          error: `Failed to upload file: ${file.name}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading author review files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
