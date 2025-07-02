import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const volume = await Volume.findByIdAndUpdate(
      params.id,
      { 
        status: 'published',
        isPublished: true,
        publishedDate: new Date(),
        lastModifiedBy: session.user.id
      },
      { new: true }
    );

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    // Also publish all issues in this volume
    await Volume.updateMany(
      { _id: params.id },
      { 
        $set: { 
          'issues.$[].isPublished': true,
          'issues.$[].publishedDate': new Date()
        }
      }
    );

    return NextResponse.json({
      message: 'Volume published successfully',
      volume
    });

  } catch (error) {
    console.error('Error publishing volume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
