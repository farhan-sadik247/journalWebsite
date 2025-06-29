import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    if (!params.filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Build filter based on user role
    let filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
    // Authors can only download their own manuscripts
    if (session.user.role === 'author') {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
    }
    // Editors and admins can download all manuscripts

    const manuscript = await Manuscript.findOne(filter).lean() as any;

    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    if (!manuscript.files || manuscript.files.length === 0) {
      return NextResponse.json(
        { error: 'No files available for download' },
        { status: 404 }
      );
    }

    // Find the specific file by filename
    const targetFile = manuscript.files.find((file: any) => 
      file.filename === params.filename || file.originalName === params.filename
    );

    if (!targetFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    if (targetFile.url) {
      console.log('Downloading file:', targetFile.originalName);
      console.log('Cloudinary URL:', targetFile.url);
      
      try {
        // Fetch the file from Cloudinary
        const response = await fetch(targetFile.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const fileBuffer = await response.arrayBuffer();
        
        // Ensure the filename has the correct extension
        let filename = targetFile.originalName || 'document.pdf';
        if (!filename.toLowerCase().endsWith('.pdf') && targetFile.originalName?.toLowerCase().includes('pdf')) {
          filename = filename + '.pdf';
        }
        
        // Create headers for file download
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Length', fileBuffer.byteLength.toString());
        
        console.log('Sending file with headers:', {
          filename,
          contentType: 'application/pdf',
          size: fileBuffer.byteLength
        });
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: headers,
        });
        
      } catch (fetchError) {
        console.error('Error fetching file from Cloudinary:', fetchError);
        return NextResponse.json(
          { error: 'Failed to download file from storage' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'File URL not available' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Download file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
