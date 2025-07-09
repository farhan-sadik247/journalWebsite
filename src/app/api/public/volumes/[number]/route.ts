import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';

export async function GET(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    await dbConnect();

    const volumeNumber = parseInt(params.number);
    
    if (isNaN(volumeNumber)) {
      return NextResponse.json(
        { error: 'Invalid volume number' },
        { status: 400 }
      );
    }

    // Find the volume by number and only include published volumes
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

    // Get published manuscripts for this volume
    const manuscripts = await Manuscript
      .find({ volume: volumeNumber, status: 'published' })
      .select('_id title authors abstract pages issue')
      .lean();

    // Transform data for response
    const transformedManuscripts = manuscripts.map(ms => ({
      _id: ms._id,
      title: ms.title,
      authors: ms.authors,
      abstract: ms.abstract,
      pages: ms.pages,
      issue: ms.issue
    }));

    // Group manuscripts by issue
    const issuesWithManuscripts = volume.issues?.map((issue: any) => {
      const issueManuscripts = transformedManuscripts.filter(
        (ms: any) => ms.issue === issue.number
      );
      
      return {
        ...issue,
        manuscripts: issueManuscripts.map((ms: any) => ({
          _id: ms._id,
          title: ms.title,
          authors: ms.authors,
          abstract: ms.abstract,
          pages: ms.pages,
          issue: ms.issue
        }))
      };
    }).filter((issue: any) => issue.isPublished) || [];

    const responseVolume = {
      _id: volume._id,
      number: volume.number,
      year: volume.year,
      title: volume.title,
      description: volume.description,
      publishedDate: volume.publishedDate,
      issues: issuesWithManuscripts
    };

    return NextResponse.json({ volume: responseVolume });

  } catch (error) {
    console.error('Error fetching volume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
