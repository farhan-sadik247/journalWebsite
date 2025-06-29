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
    console.log('=== DEBUG Download endpoint called ===');
    console.log('Manuscript ID:', params.id);
    
    const session = await getServerSession(authOptions);
    console.log('Session exists:', !!session);
    
    if (!session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id).lean() as any;
    
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    return NextResponse.json({
      manuscript: {
        id: manuscript._id,
        title: manuscript.title,
        filesCount: manuscript.files?.length || 0,
        files: manuscript.files?.map((file: any) => ({
          filename: file.filename,
          originalName: file.originalName,
          url: file.url,
          size: file.size,
          type: file.type,
          cloudinaryId: file.cloudinaryId,
        })) || [],
        hasFiles: !!(manuscript.files && manuscript.files.length > 0),
        firstFileUrl: manuscript.files?.[0]?.url || null,
      }
    });
  } catch (error: any) {
    console.error('Debug download error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
