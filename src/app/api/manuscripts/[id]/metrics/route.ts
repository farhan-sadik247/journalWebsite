import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { metricType } = await request.json();

    if (!metricType || !['view', 'download'].includes(metricType)) {
      return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id);

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Only track metrics for published manuscripts
    if (manuscript.status !== 'published') {
      return NextResponse.json({ error: 'Manuscript not published' }, { status: 400 });
    }

    // Update the appropriate metric
    const updateField = metricType === 'view' ? 'metrics.views' : 'metrics.downloads';
    
    await Manuscript.findByIdAndUpdate(
      params.id,
      { $inc: { [updateField]: 1 } }
    );

    return NextResponse.json({ message: 'Metric updated successfully' });

  } catch (error) {
    console.error('Error updating metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).select('metrics');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    return NextResponse.json({
      metrics: manuscript.metrics || { views: 0, downloads: 0, citations: 0 }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
