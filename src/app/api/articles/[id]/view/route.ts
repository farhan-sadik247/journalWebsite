import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

// POST /api/articles/[id]/view - Increment view count
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const manuscriptId = params.id;

    // Increment view count
    await Manuscript.findByIdAndUpdate(
      manuscriptId,
      { 
        $inc: { 'metrics.views': 1 },
        $setOnInsert: { 
          'metrics.downloads': 0,
          'metrics.citations': 0
        }
      },
      { 
        upsert: false,
        new: true 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}
