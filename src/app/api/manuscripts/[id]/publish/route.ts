import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Volume from '@/models/Volume';
import { sendEmail } from '@/lib/email';

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

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy authors.user');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if manuscript is ready for publication
    if (manuscript.copyEditingStage !== 'ready-for-publication') {
      return NextResponse.json({ 
        error: 'Manuscript is not ready for publication' 
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
    ).populate('submittedBy authors.user');

    // Send publication notification emails
    const emailSubject = `Your manuscript has been published - ${manuscript.title}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 Congratulations! Your manuscript has been published</h2>
        <p>Dear Author(s),</p>
        
        <p>We are pleased to inform you that your manuscript "<strong>${manuscript.title}</strong>" has been successfully published!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Publication Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Volume:</strong> ${volume}</li>
            ${issue ? `<li><strong>Issue:</strong> ${issue}</li>` : ''}
            <li><strong>Pages:</strong> ${pages}</li>
            ${doi ? `<li><strong>DOI:</strong> <a href="https://doi.org/${doi}">${doi}</a></li>` : ''}
            <li><strong>Published Date:</strong> ${new Date(publishedDate).toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>Your article is now available online and can be accessed by the research community worldwide.</p>
        
        <p><a href="${process.env.NEXTAUTH_URL}/articles/${manuscript._id}" 
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           View Published Article
        </a></p>
        
        <p>Thank you for choosing our journal for your research publication.</p>
        
        <p>Best regards,<br>Editorial Team</p>
      </div>
    `;

    // Send emails to all authors
    const authorEmails = manuscript.authors.map((author: any) => author.email);
    
    for (const email of authorEmails) {
      try {
        await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailContent,
        });
      } catch (emailError) {
        console.error('Failed to send publication notification email:', emailError);
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
