import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { transformManuscriptsForFrontend } from '@/lib/manuscriptUtils';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const author = searchParams.get('author') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const exportResults = searchParams.get('export') === 'true';

    // Build MongoDB query
    const mongoQuery: any = {};

    // Text search
    if (query) {
      mongoQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { abstract: { $regex: query, $options: 'i' } },
        { keywords: { $in: [new RegExp(query, 'i')] } },
        { 'authors.name': { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      mongoQuery.category = category;
    }

    // Status filter - only show published or specified status
    if (status) {
      mongoQuery.status = status;
    } else {
      // Default to only published articles for public search
      mongoQuery.status = { $in: ['published', 'in-production'] };
    }

    // Author filter
    if (author) {
      mongoQuery['authors.name'] = { $regex: author, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      mongoQuery.publishedDate = dateFilter;
    }

    // Build sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'date':
        sortOptions = { publishedDate: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'title':
        sortOptions = { title: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'citations':
        sortOptions = { 'metrics.citations': sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'views':
        sortOptions = { 'metrics.views': sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'relevance':
      default:
        if (query) {
          sortOptions = { score: { $meta: 'textScore' } };
          mongoQuery.$text = { $search: query };
        } else {
          sortOptions = { publishedDate: -1 };
        }
        break;
    }

    if (exportResults) {
      // Export all results as CSV
      const manuscripts = await Manuscript.find(mongoQuery)
        .select('title abstract authors category status submissionDate publishedDate doi metrics keywords')
        .sort(sortOptions)
        .lean();

      const csvHeader = [
        'Title',
        'Authors',
        'Category',
        'Status',
        'Submission Date',
        'Published Date',
        'DOI',
        'Views',
        'Downloads',
        'Citations',
        'Keywords'
      ].join(',');

      const csvRows = manuscripts.map(manuscript => [
        `"${manuscript.title.replace(/"/g, '""')}"`,
        `"${manuscript.authors.map((a: any) => a.name).join('; ')}"`,
        manuscript.category,
        manuscript.status,
        manuscript.submissionDate ? new Date(manuscript.submissionDate).toISOString().split('T')[0] : '',
        manuscript.publishedDate ? new Date(manuscript.publishedDate).toISOString().split('T')[0] : '',
        manuscript.doi || '',
        manuscript.metrics?.views || 0,
        manuscript.metrics?.downloads || 0,
        manuscript.metrics?.citations || 0,
        `"${manuscript.keywords.join('; ')}"`
      ].join(',')).join('\n');

      const csvContent = [csvHeader, csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="manuscript-search-results-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Regular search with pagination
    const skip = (page - 1) * limit;

    const [manuscriptsRaw, total] = await Promise.all([
      Manuscript.find(mongoQuery)
        .select('title abstract authors category status submissionDate publishedDate doi metrics keywords')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Manuscript.countDocuments(mongoQuery)
    ]);

    // Transform authors to include firstName and lastName for frontend compatibility
    const manuscripts = transformManuscriptsForFrontend(manuscriptsRaw);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      manuscripts,
      total,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error searching manuscripts:', error);
    return NextResponse.json(
      { error: 'Failed to search manuscripts' },
      { status: 500 }
    );
  }
}
