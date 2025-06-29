import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Volume from '@/models/Volume';
import { notifyPublicationComplete } from '@/lib/notificationUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is editor or admin
    if (session.user.role !== 'editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { volume, issue, pages, doi, publishedDate } = await request.json();

    if (!volume || !pages || !publishedDate) {
      return NextResponse.json({ 
        error: 'Volume, pages, and published date are required' 
      }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if manuscript is ready for publication (should be author-approved)
    if (manuscript.draftStatus !== 'approved-by-author') {
      return NextResponse.json({ 
        error: 'Manuscript must be approved by author before publication' 
      }, { status: 400 });
    }

    // Verify volume exists
    const volumeDoc = await Volume.findOne({ number: volume });
    if (!volumeDoc) {
      return NextResponse.json({ error: 'Volume not found' }, { status: 400 });
    }

    // Check if DOI already exists
    if (doi) {
      const existingDoi = await Manuscript.findOne({ doi, _id: { $ne: params.id } });
      if (existingDoi) {
        return NextResponse.json({ error: 'DOI already exists' }, { status: 400 });
      }
    }

    // Update manuscript with publication information
    const updateData: any = {
      status: 'published',
      volume: volume,
      pages: pages,
      publishedDate: new Date(publishedDate),
      lastModified: new Date(),
    };

    if (issue) updateData.issue = issue;
    if (doi) updateData.doi = doi;

    // Add timeline event
    const timelineEvent = {
      event: 'Manuscript Published',
      description: `Published in Volume ${volume}${issue ? `, Issue ${issue}` : ''}, pages ${pages}${doi ? ` with DOI: ${doi}` : ''}`,
      date: new Date(),
      performedBy: session.user.id
    };

    updateData.$push = { timeline: timelineEvent };

    const publishedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy', 'name email');

    // Send notification to all authors
    const volumeInfo = `Volume ${volume}${issue ? `, Issue ${issue}` : ''}`;
    
    // Notify primary author
    await notifyPublicationComplete(
      manuscript.submittedBy.email,
      params.id,
      manuscript.title,
      volumeInfo
    );
    
    // Notify co-authors if they exist
    if (manuscript.authors && manuscript.authors.length > 0) {
      for (const author of manuscript.authors) {
        if (author.email && author.email !== manuscript.submittedBy.email) {
          await notifyPublicationComplete(
            author.email,
            params.id,
            manuscript.title,
            volumeInfo
          );
        }
      }
    }

    // Update manuscript metrics
    await Manuscript.findByIdAndUpdate(params.id, {
      $inc: { 'metrics.views': 0 } // Initialize if needed
    });

    return NextResponse.json({
      message: 'Manuscript published successfully',
      manuscript: publishedManuscript
    });

  } catch (error) {
    console.error('Error publishing manuscript:', error);
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('authors.user', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Return publication-specific information
    const publicationInfo = {
      _id: manuscript._id,
      title: manuscript.title,
      status: manuscript.status,
      copyEditingStage: manuscript.copyEditingStage,
      volume: manuscript.volume,
      issue: manuscript.issue,
      pages: manuscript.pages,
      doi: manuscript.doi,
      publishedDate: manuscript.publishedDate,
      authors: manuscript.authors,
      category: manuscript.category,
      canPublish: manuscript.copyEditingStage === 'ready-for-publication' && manuscript.status !== 'published'
    };

    return NextResponse.json({
      publicationInfo
    });

  } catch (error) {
    console.error('Error fetching publication info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
