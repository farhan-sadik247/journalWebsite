import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';
import Manuscript from '@/models/Manuscript';
import { generateManuscriptDOI, isDOIUnique } from '@/lib/doiUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has editor or admin role in either role or roles array
    const userRole = session.user.role;
    const userRoles = session.user.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { volume, issue, pages } = await request.json();

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume number is required' },
        { status: 400 }
      );
    }

    // Find the volume document
    const volumeDoc = await Volume.findOne({ number: volume });
    if (!volumeDoc) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    // Find the manuscript
    const manuscript = await Manuscript.findById(params.id);
    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Generate DOI if it doesn't exist
    let finalDoi = manuscript.doi;
    if (!finalDoi) {
      finalDoi = await generateManuscriptDOI(volumeDoc.year, volume, issue || 1);
      
      // Verify DOI uniqueness
      const isUnique = await isDOIUnique(finalDoi, params.id);
      if (!isUnique) {
        return NextResponse.json(
          { error: 'Generated DOI already exists' },
          { status: 400 }
        );
      }
    }

    // Update manuscript
    const updateData: any = {
      status: 'published',
      publishedDate: new Date(),
      volume: volume,
      doi: finalDoi
    };

    if (issue) updateData.issue = issue;
    if (pages) updateData.pages = pages;

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    // Add to timeline
    const timelineEvent = {
      event: 'published',
      description: `Published in Volume ${volume}${issue ? `, Issue ${issue}` : ''}, pages ${pages}${finalDoi ? ` with DOI: ${finalDoi}` : ''}`,
      performedBy: session.user.id,
      date: new Date()
    };

    await Manuscript.findByIdAndUpdate(
      params.id,
      { $push: { timeline: timelineEvent } }
    );

    return NextResponse.json({
      success: true,
      message: 'Manuscript published successfully',
      data: {
        manuscript: updatedManuscript,
        doi: finalDoi
      }
    });

  } catch (error) {
    console.error('Error publishing manuscript:', error);
    return NextResponse.json(
      { error: 'Failed to publish manuscript' },
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

    await connectToDatabase();

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
