import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Volume from '@/models/Volume';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const volume = searchParams.get('volume');
    const issue = searchParams.get('issue');

    // Build filter for published articles only
    const filter: Record<string, any> = {
      status: 'published'
    };

    // Add search query if provided
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { abstract: { $regex: query, $options: 'i' } },
        { keywords: { $in: [new RegExp(query, 'i')] } },
        { 'authors.name': { $regex: query, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add volume filter
    if (volume) {
      filter.volume = parseInt(volume);
    }

    // Add issue filter
    if (issue) {
      filter.issue = parseInt(issue);
    }

    const skip = (page - 1) * limit;

    // Get articles with pagination
    const articles = await Manuscript.find(filter, {
      title: 1,
      authors: 1,
      abstract: 1,
      keywords: 1,
      category: 1,
      volume: 1,
      issue: 1,
      doi: 1,
      publishedDate: 1,
      downloadCount: 1,
      pages: 1,
      submittedDate: 1
    })
    .sort({ publishedDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    // Get total count for pagination
    const totalCount = await Manuscript.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    // Enhance articles with volume/issue information
    const enhancedArticles = await Promise.all(
      articles.map(async (article) => {
        if (article.volume) {
          const volumeDoc = await Volume.findOne(
            { number: article.volume },
            { number: 1, year: 1, title: 1, issues: 1 }
          ).lean() as any;

          if (volumeDoc && article.issue) {
            const issue = volumeDoc.issues?.find((iss: any) => iss.number === article.issue);
            return {
              ...article,
              volumeInfo: {
                number: volumeDoc.number,
                year: volumeDoc.year,
                title: volumeDoc.title
              },
              issueInfo: issue ? {
                number: issue.number,
                title: issue.title
              } : null
            };
          }
        }
        return article;
      })
    );

    // Get available categories and volumes for filters
    const availableCategories = await Manuscript.distinct('category', { status: 'published' });
    const availableVolumes = await Manuscript.distinct('volume', { 
      status: 'published', 
      volume: { $exists: true, $ne: null } 
    }).sort();

    return NextResponse.json({
      success: true,
      data: {
        articles: enhancedArticles,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        },
        filters: {
          categories: availableCategories,
          volumes: availableVolumes
        }
      }
    });

  } catch (error) {
    console.error('Error searching articles:', error);
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    );
  }
}
