import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== Download endpoint called ===');
  console.log('Manuscript ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'exists' : 'null');
    console.log('User ID:', session?.user?.id);
    console.log('User role:', session?.user?.role);
    
    if (!session) {
      console.log('ERROR: No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      console.log('ERROR: Invalid manuscript ID:', params.id);
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    // Build filter based on user role
    const filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
    // Authors can only download their own manuscripts
    if (session.user.role === 'author') {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
    }
    // Editors and admins can download all manuscripts

    console.log('Query filter:', filter);
    const manuscript = await Manuscript.findOne(filter).lean() as any;
    console.log('Manuscript found:', manuscript ? 'yes' : 'no');
    
    if (manuscript) {
      console.log('Manuscript title:', manuscript.title);
      console.log('Files count:', manuscript.files?.length || 0);
      console.log('First file info:', manuscript.files?.[0] ? {
        originalName: manuscript.files[0].originalName,
        url: manuscript.files[0].url ? 'exists' : 'missing',
        type: manuscript.files[0].type
      } : 'no files');
    }

    if (!manuscript) {
      console.log('ERROR: Manuscript not found with filter:', filter);
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    if (!manuscript.files || manuscript.files.length === 0) {
      console.log('ERROR: No files available for manuscript');
      return NextResponse.json(
        { error: 'No files available for download' },
        { status: 404 }
      );
    }

    const firstFile = manuscript.files[0];
    console.log('Attempting to download file:', {
      originalName: firstFile.originalName,
      url: firstFile.url,
      type: firstFile.type,
      size: firstFile.size
    });
    
    if (firstFile.url) {
      console.log('Downloading first file:', firstFile.originalName);
      console.log('Cloudinary URL:', firstFile.url);
      
      try {
        // Fetch the file from Cloudinary
        const response = await fetch(firstFile.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const fileBuffer = await response.arrayBuffer();
        
        // Ensure the filename has the correct extension
        let filename = firstFile.originalName || 'manuscript.pdf';
        if (!filename.toLowerCase().endsWith('.pdf') && firstFile.originalName?.toLowerCase().includes('pdf')) {
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
      console.log('ERROR: File URL not available');
      return NextResponse.json(
        { error: 'File URL not available' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Download manuscript error:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
