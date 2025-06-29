import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get manuscripts with file info for debugging
    const manuscripts = await Manuscript.find({
      submittedBy: session.user.id
    }).select('title files submissionDate').lean();

    const fileInfo = manuscripts.map(manuscript => ({
      id: manuscript._id,
      title: manuscript.title,
      submissionDate: manuscript.submissionDate,
      filesCount: manuscript.files?.length || 0,
      files: manuscript.files?.map((file: any) => ({
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        hasUrl: !!file.url,
        url: file.url?.substring(0, 50) + '...' // Show partial URL for debugging
      })) || []
    }));

    return NextResponse.json({
      manuscriptsCount: manuscripts.length,
      manuscripts: fileInfo
    });

  } catch (error) {
    console.error('Debug manuscripts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
