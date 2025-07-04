import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Volume from '@/models/Volume';
import { notifyPublicationComplete } from '@/lib/notificationUtils';
import { generateManuscriptDOI, isDOIUnique } from '@/lib/doiUtils';

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
    const hasEditorRole = session.user.roles?.includes('editor') || session.user.role === 'editor';
    const hasAdminRole = session.user.roles?.includes('admin') || session.user.role === 'admin';
    
    if (!hasEditorRole && !hasAdminRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { volume, issue, pages, doi, publishedDate, action, generateDoi } = await request.json();

    // For direct publish, we don't require volume and pages
    if (action !== 'direct-publish' && (!volume || !pages || !publishedDate)) {
      return NextResponse.json({ 
        error: 'Volume, pages, and published date are required' 
      }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if manuscript is ready for publication
    const isReadyForPublication = manuscript.status === 'ready-for-publication' || 
                                  manuscript.copyEditingStage === 'author-approved' ||
                                  manuscript.draftStatus === 'approved-by-author';
    
    if (!isReadyForPublication) {
      return NextResponse.json({ 
        error: 'Manuscript must be approved by author before publication' 
      }, { status: 400 });
    }

    // For direct publish, skip volume verification
    if (action !== 'direct-publish') {
      // Verify volume exists
      const volumeDoc = await Volume.findOne({ number: volume });
      if (!volumeDoc) {
        return NextResponse.json({ error: 'Volume not found' }, { status: 400 });
      }
    }

    // Generate DOI if requested
    let finalDoi = doi;
    if (generateDoi && volume) {
      const volumeDoc = await Volume.findOne({ number: volume });
      if (volumeDoc) {
        finalDoi = await generateManuscriptDOI(volumeDoc.year, volume, issue || 1);
      }
    }

    // Check if DOI already exists
    if (finalDoi) {
      const isUnique = await isDOIUnique(finalDoi, params.id);
      if (!isUnique) {
        return NextResponse.json({ error: 'DOI already exists' }, { status: 400 });
      }
    }

    // Update manuscript with publication information
    const updateData: any = {
      status: 'published',
      publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
      lastModified: new Date(),
    };

    // Only add volume/pages for formal publication
    if (action !== 'direct-publish') {
      updateData.volume = volume;
      updateData.pages = pages;
    }

    if (issue) updateData.issue = issue;
    if (finalDoi) updateData.doi = finalDoi;

    // Add timeline event
    const timelineEvent = {
      event: 'Manuscript Published',
      description: action === 'direct-publish' 
        ? `Published directly to archive${finalDoi ? ` with DOI: ${finalDoi}` : ''}`
        : `Published in Volume ${volume}${issue ? `, Issue ${issue}` : ''}, pages ${pages}${finalDoi ? ` with DOI: ${finalDoi}` : ''}`,
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
    const volumeInfo = action === 'direct-publish' 
      ? 'directly to the archive' 
      : `Volume ${volume}${issue ? `, Issue ${issue}` : ''}`;
    
    // Notify primary author (non-blocking)
    try {
      await notifyPublicationComplete(
        manuscript.submittedBy.email,
        params.id,
        manuscript.title,
        volumeInfo
      );
    } catch (notificationError) {
      console.warn('Failed to notify primary author:', notificationError);
    }
    
    // Notify co-authors if they exist (non-blocking)
    if (manuscript.authors && manuscript.authors.length > 0) {
      for (const author of manuscript.authors) {
        if (author.email && author.email !== manuscript.submittedBy.email) {
          try {
            await notifyPublicationComplete(
              author.email,
              params.id,
              manuscript.title,
              volumeInfo
            );
          } catch (notificationError) {
            console.warn(`Failed to notify co-author ${author.email}:`, notificationError);
          }
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
