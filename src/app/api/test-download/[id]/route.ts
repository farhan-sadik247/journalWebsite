import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== SIMPLE Download Test ===');
    console.log('Manuscript ID:', params.id);

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id).lean() as any;
    
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    console.log('Manuscript found:', manuscript.title);
    console.log('Files:', manuscript.files?.length || 0);

    if (!manuscript.files || manuscript.files.length === 0) {
      return NextResponse.json({ error: 'No files' }, { status: 404 });
    }

    const firstFile = manuscript.files[0];
    console.log('First file details:', {
      originalName: firstFile.originalName,
      url: firstFile.url,
      cloudinaryId: firstFile.cloudinaryId,
      size: firstFile.size,
      type: firstFile.type
    });

    if (!firstFile.url) {
      return NextResponse.json({ error: 'No file URL' }, { status: 404 });
    }

    console.log('Attempting to fetch from Cloudinary:', firstFile.url);
    
    try {
      const fileResponse = await fetch(firstFile.url);
      console.log('Cloudinary fetch status:', fileResponse.status);
      console.log('Cloudinary response headers:', Object.fromEntries(fileResponse.headers.entries()));

      if (!fileResponse.ok) {
        console.log('Cloudinary fetch failed');
        return NextResponse.json({
          error: 'File not accessible from Cloudinary',
          status: fileResponse.status,
          statusText: fileResponse.statusText
        }, { status: 404 });
      }

      console.log('Cloudinary fetch successful, getting buffer...');
      const fileBuffer = await fileResponse.arrayBuffer();
      console.log('Buffer size:', fileBuffer.byteLength);

      // Just return a success message for now to test if the process works
      return NextResponse.json({
        success: true,
        fileInfo: {
          originalName: firstFile.originalName,
          url: firstFile.url,
          bufferSize: fileBuffer.byteLength,
          cloudinaryResponse: {
            status: fileResponse.status,
            headers: Object.fromEntries(fileResponse.headers.entries())
          }
        }
      });

    } catch (fetchError: any) {
      console.error('Cloudinary fetch error:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch from Cloudinary',
        details: fetchError.message,
        url: firstFile.url
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test download error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
