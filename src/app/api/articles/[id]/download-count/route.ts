import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    // Increment download count
    const result = await Manuscript.findByIdAndUpdate(
      params.id,
      { 
        $inc: { 'metrics.downloads': 1 } 
      },
      { 
        new: true,
        upsert: false
      }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      downloads: result.metrics?.downloads || 1
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
