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

    await dbConnect();

    // Build filter based on user role
    const filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
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

    // Return file information instead of attempting download
    // This is useful for debugging and when file storage isn't configured
    return NextResponse.json({
      files: manuscript.files.map((file: any) => ({
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        type: file.type,
        url: file.url,
        downloadUrl: `/api/manuscripts/${params.id}/download/${file.filename}`
      }))
    });

  } catch (error) {
    console.error('Download manuscript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
