import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { transformManuscriptForFrontend } from '@/lib/manuscriptUtils';

// GET /api/articles/[id] - Get specific article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const article = await Manuscript.findOne({
      _id: params.id,
      status: 'published'
    })
    .populate('submittedBy', 'name email')
    .lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Transform authors to include firstName and lastName for frontend compatibility
    const articleData = transformManuscriptForFrontend(article);

    // Increment view count
    await Manuscript.updateOne(
      { _id: params.id },
      { $inc: { 'metrics.views': 1 } }
    );

    return NextResponse.json({ article: articleData });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
