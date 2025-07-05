import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { uploadToStorage } from '@/lib/storage';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// POST /api/manuscripts/[id]/revisions - Submit manuscript revision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid manuscript ID' }, { status: 400 });
    }

    await dbConnect();

    // Find the manuscript and verify ownership
    const manuscript = await Manuscript.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      submittedBy: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found or unauthorized' }, { status: 404 });
    }

    // Check if manuscript is in a valid revision status
    const validRevisionStatuses = ['revision-requested', 'major-revision-requested', 'minor-revision-requested'];
    if (!validRevisionStatuses.includes(manuscript.status)) {
      return NextResponse.json({ 
        error: 'Manuscript is not in a revision-requested status' 
      }, { status: 400 });
    }

    const formData = await request.formData();
    const responseToReviewers = formData.get('responseToReviewers') as string;
    const summaryOfChanges = formData.get('summaryOfChanges') as string;
    const files = formData.getAll('files') as File[];

    // Validate required fields
    if (!responseToReviewers || !summaryOfChanges) {
      return NextResponse.json({
        error: 'Response to reviewers and summary of changes are required'
      }, { status: 400 });
    }

    if (files.length === 0 || files.every(file => file.size === 0)) {
      return NextResponse.json({
        error: 'At least one revised file must be uploaded'
      }, { status: 400 });
    }

    // Upload revised files
    const uploadedFiles = [];
    console.log('Processing revision files for upload:', files.length, 'files');

    for (const file of files) {
      if (file.size > 0) {
        console.log('Uploading revision file:', file.name, 'size:', file.size);
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const uploadResult = await uploadToStorage(buffer, file.name, `manuscripts/${params.id}/revisions`);
          
          console.log('Upload successful:', uploadResult.public_id, 'URL:', uploadResult.secure_url);
          
          uploadedFiles.push({
            filename: uploadResult.public_id,
            originalName: file.name,
            storageId: uploadResult.public_id, // Use storageId for new system
            cloudinaryId: uploadResult.public_id, // Keep for backward compatibility
            url: uploadResult.secure_url,
            type: 'revision',
            size: uploadResult.bytes,
            version: manuscript.currentVersion + 1,
          });
        } catch (uploadError) {
          console.error('File upload failed for:', file.name, uploadError);
          return NextResponse.json(
            { error: `Failed to upload file: ${file.name}` },
            { status: 500 }
          );
        }
      }
    }

    console.log('Total uploaded revision files:', uploadedFiles.length);

    // Update manuscript with revision
    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      {
        $set: {
          status: 'under-review',
          currentVersion: manuscript.currentVersion + 1,
          lastModified: new Date()
        },
        $push: {
          files: { $each: uploadedFiles },
          timeline: {
            event: 'revision-submitted',
            description: 'Revised manuscript submitted',
            performedBy: new mongoose.Types.ObjectId(session.user.id),
            metadata: {
              responseToReviewers,
              summaryOfChanges,
              filesCount: uploadedFiles.length,
              version: manuscript.currentVersion + 1
            }
          }
        }
      },
      { new: true }
    ).populate('submittedBy', 'name email');

    // Send notification emails to editors
    try {
      // In a real system, you'd fetch editors from the database
      // For now, we'll send to admin/editor emails
      const editorEmails = process.env.EDITOR_EMAILS?.split(',') || [];
      
      for (const editorEmail of editorEmails) {
        if (editorEmail.trim()) {
          await sendEmail({
            to: editorEmail.trim(),
            subject: `Revision Submitted - ${updatedManuscript.title}`,
            html: generateRevisionNotificationEmail(
              updatedManuscript.title,
              (updatedManuscript.submittedBy as any).name,
              responseToReviewers,
              summaryOfChanges,
              params.id
            ),
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send revision notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Revision submitted successfully',
      revision: {
        manuscriptId: params.id,
        version: updatedManuscript.currentVersion,
        status: updatedManuscript.status,
        filesCount: uploadedFiles.length,
        submissionDate: new Date()
      }
    });

  } catch (error) {
    console.error('Revision submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/revisions - Get revision history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid manuscript ID' }, { status: 400 });
    }

    await dbConnect();

    // Build filter based on user role
    const filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
    // Authors can only see their own manuscripts
    if (session.user.role === 'author' || session.user.roles?.includes('author')) {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
    }
    // Editors and admins can see all manuscripts

    const manuscript = await Manuscript.findOne(filter).lean();

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Extract revision history from timeline
    const revisionHistory = (manuscript as any).timeline.filter((event: any) => 
      event.event === 'revision-submitted' || event.event === 'editorial-decision'
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      revisions: revisionHistory,
      currentVersion: (manuscript as any).currentVersion || 1
    });

  } catch (error) {
    console.error('Error fetching revision history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRevisionNotificationEmail(
  manuscriptTitle: string,
  authorName: string,
  responseToReviewers: string,
  summaryOfChanges: string,
  manuscriptId: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Revision Submitted</h2>
      <p>Dear Editor,</p>
      
      <p>A revised manuscript has been submitted and requires your attention.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #374151;">Manuscript Details:</h3>
        <p style="margin: 5px 0;"><strong>Title:</strong> ${manuscriptTitle}</p>
        <p style="margin: 5px 0;"><strong>Author:</strong> ${authorName}</p>
        <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> Under Review (Revised)</p>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin-bottom: 10px;">Summary of Changes:</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #2563eb; line-height: 1.6;">
          ${summaryOfChanges.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin-bottom: 10px;">Response to Reviewers:</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981; line-height: 1.6;">
          ${responseToReviewers.replace(/\n/g, '<br>')}
        </div>
      </div>

      <p style="margin-top: 30px;">
        Please log into the editorial dashboard to review the revised manuscript and assign it for re-review if necessary.
      </p>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscriptId}" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Review Manuscript
        </a>
      </p>

      <p style="margin-top: 30px;">Best regards,<br>Journal System</p>
    </div>
  `;
}
