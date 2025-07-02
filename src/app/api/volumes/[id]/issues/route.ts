import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const volume = await Volume.findById(params.id, {
      issues: 1
    }).lean();

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      issues: (volume as any).issues || []
    });

  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}
