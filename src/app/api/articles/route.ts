import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { transformManuscriptsForFrontend } from '@/lib/manuscriptUtils';
import Volume from '@/models/Volume';

// GET /api/articles - Get published articles
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const volume = searchParams.get('volume');
    const issue = searchParams.get('issue');
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const recent = searchParams.get('recent');

    // Build filter for published articles
    const filter: any = { 
      status: 'published',
      publishedDate: { $exists: true }
    };

    if (volume) filter.volume = parseInt(volume);
    if (issue) filter.issue = parseInt(issue);
    if (category) filter.category = category;
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { abstract: { $regex: query, $options: 'i' } },
        { keywords: { $in: [new RegExp(query, 'i')] } },
        { 'authors.name': { $regex: query, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // For recent articles (homepage), get latest 6
    const actualLimit = recent === 'true' ? 6 : limit;
    const actualSkip = recent === 'true' ? 0 : skip;

    const [articlesRaw, total] = await Promise.all([
      Manuscript.find(filter)
        .select('title abstract authors category keywords doi volume issue pages publishedDate metrics')
        .sort({ publishedDate: -1 })
        .skip(actualSkip)
        .limit(actualLimit)
        .lean(),
      recent === 'true' ? Promise.resolve(6) : Manuscript.countDocuments(filter),
    ]);

    // Transform authors to include firstName and lastName for frontend compatibility
    const articles = transformManuscriptsForFrontend(articlesRaw);

    return NextResponse.json({
      articles,
      pagination: recent === 'true' ? null : {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/articles - Publish an article (editor/admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['editor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { manuscriptId, volumeNumber, issueNumber, doi, pages } = body;

    // Validate inputs
    if (!manuscriptId || !volumeNumber || !issueNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if manuscript exists and is accepted
    const manuscript = await Manuscript.findById(manuscriptId);
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    if (manuscript.status !== 'accepted') {
      return NextResponse.json({ error: 'Manuscript must be accepted before publishing' }, { status: 400 });
    }

    // Find or create volume/issue
    let volume = await Volume.findOne({ number: volumeNumber });
    if (!volume) {
      volume = new Volume({
        number: volumeNumber,
        year: new Date().getFullYear(),
        issues: []
      });
    }

    // Check if issue exists in this volume
    let issue = volume.issues.find((i: any) => i.number === issueNumber);
    if (!issue) {
      issue = {
        number: issueNumber,
        publishedDate: new Date(),
        articles: []
      };
      volume.issues.push(issue);
    }

    // Update manuscript with publication info
    manuscript.status = 'published';
    manuscript.publishedDate = new Date();
    manuscript.publication = {
      volume: volumeNumber,
      issue: issueNumber,
      pages: pages || '',
      doi: doi || `10.1234/journal.${volumeNumber}.${issueNumber}.${Date.now()}`
    };

    // Add article to issue
    issue.articles.push({
      manuscript: manuscript._id,
      pages: pages || '',
      doi: manuscript.publication.doi
    });

    // Save both documents
    await Promise.all([
      manuscript.save(),
      volume.save()
    ]);

    return NextResponse.json({ 
      message: 'Article published successfully',
      article: manuscript.toObject(),
      publication: manuscript.publication
    });
  } catch (error) {
    console.error('Error publishing article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
