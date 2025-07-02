import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';

export async function GET(
  request: NextRequest,
  { params }: { params: { number: string; issueNumber: string } }
) {
  try {
    await dbConnect();

    const volumeNumber = parseInt(params.number);
    const issueNumber = parseInt(params.issueNumber);
    
    if (isNaN(volumeNumber) || isNaN(issueNumber)) {
      return NextResponse.json(
        { error: 'Invalid volume or issue number' },
        { status: 400 }
      );
    }

    // Find the volume and specific issue
    const volume = await Volume.findOne({ 
      number: volumeNumber,
      isPublished: true 
    }).lean() as any;

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    // Find the specific issue
    const issue = volume.issues?.find((issue: any) => 
      issue.number === issueNumber && issue.isPublished
    );

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Get published manuscripts for this specific issue
    const publishedManuscripts = await Manuscript.find({
      volume: volumeNumber,
      issue: issueNumber,
      status: 'published'
    })
    .select('_id title authors abstract pages doi publishedDate metrics')
    .sort({ publishedDate: 1 })
    .lean() as any[];

    const responseIssue = {
      _id: issue._id,
      number: issue.number,
      title: issue.title,
      description: issue.description,
      publishedDate: issue.publishedDate,
      volume: {
        _id: volume._id,
        number: volume.number,
        year: volume.year,
        title: volume.title
      },
      manuscripts: publishedManuscripts.map((ms: any) => ({
        _id: ms._id,
        title: ms.title,
        authors: ms.authors,
        abstract: ms.abstract,
        pages: ms.pages,
        doi: ms.doi,
        publishedDate: ms.publishedDate,
        metrics: ms.metrics
      }))
    };

    return NextResponse.json({ issue: responseIssue });

  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
