import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all published volumes with their issues
    const volumes = await Volume.find(
      { isPublished: true },
      {
        number: 1,
        year: 1,
        title: 1,
        description: 1,
        isPublished: 1,
        publishedDate: 1,
        issues: 1,
      }
    ).sort({ year: -1, number: -1 }).lean();

    // For each volume, get manuscript counts
    const volumesWithCounts = await Promise.all(
      volumes.map(async (volume) => {
        // Count total manuscripts in this volume
        const totalManuscripts = await Manuscript.countDocuments({
          volume: volume.number,
          status: 'published'
        });

        // Process issues and add manuscript counts
        const issuesWithCounts = await Promise.all(
          volume.issues
            .filter((issue: any) => issue.isPublished)
            .map(async (issue: any) => {
              const issueManuscriptCount = await Manuscript.countDocuments({
                volume: volume.number,
                issue: issue.number,
                status: 'published'
              });

              return {
                ...issue,
                manuscriptCount: issueManuscriptCount
              };
            })
        );

        return {
          ...volume,
          manuscriptCount: totalManuscripts,
          issues: issuesWithCounts
        };
      })
    );

    return NextResponse.json(volumesWithCounts);
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volumes' },
      { status: 500 }
    );
  }
}
