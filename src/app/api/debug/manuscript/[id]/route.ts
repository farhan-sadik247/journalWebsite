import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

// GET /api/debug/manuscript/[id] - Debug manuscript data structure
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id);
    
    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Return detailed author information for debugging
    return NextResponse.json({
      manuscriptId: manuscript._id,
      title: manuscript.title,
      authors: manuscript.authors.map((author: any, index: number) => ({
        index,
        name: author.name,
        email: author.email,
        affiliation: author.affiliation,
        orcid: author.orcid,
        isCorresponding: author.isCorresponding,
        hasName: !!author.name,
        nameLength: author.name ? author.name.length : 0,
        trimmedName: author.name ? author.name.trim() : '',
      })),
      correspondingAuthor: manuscript.authors.find((author: any) => author.isCorresponding),
      firstAuthor: manuscript.authors[0],
    });

  } catch (error) {
    console.error('Error debugging manuscript:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
