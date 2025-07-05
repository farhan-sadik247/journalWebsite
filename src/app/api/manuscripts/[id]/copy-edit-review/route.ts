import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { notifyAuthorCopyEditComplete } from '@/lib/notificationUtils';
import { uploadToStorage } from '@/lib/storage';

// POST /api/manuscripts/[id]/copy-edit-review - Submit copy editing review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a copy editor or admin
    if (!session.user.roles?.includes('copy-editor') && 
        session.user.role !== 'copy-editor' && 
        !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const comments = formData.get('comments') as string;
    const galleyProofFile = formData.get('galleyProofFile') as File;
    const completionStatusRaw = formData.get('completionStatus') as string;
    
    if (!comments) {
      return NextResponse.json({ error: 'Comments are required' }, { status: 400 });
    }

    // Validate completion status
    const validStatuses = ['completed', 'needs-revision'] as const;
    const completionStatus = validStatuses.includes(completionStatusRaw as any) 
      ? (completionStatusRaw as 'completed' | 'needs-revision')
      : 'completed'; // Default to completed if invalid

    await dbConnect();

    // Verify manuscript exists and user has permission
    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedCopyEditor', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if user is assigned copy editor or admin
    if (manuscript.assignedCopyEditor?._id?.toString() !== session.user.id && 
        !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'You are not assigned as copy editor for this manuscript' }, { status: 403 });
    }

    let galleyProofUrl = null;
    let galleyProofPublicId = null;

    // Handle galley proof file upload if provided
    if (galleyProofFile && galleyProofFile.size > 0) {
      try {
        // Convert file to buffer
        const bytes = await galleyProofFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to local storage
        const uploadResult = await uploadToStorage(buffer, galleyProofFile.name, 'galley-proofs');

        galleyProofUrl = uploadResult.secure_url;
        galleyProofPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Error uploading galley proof:', uploadError);
        return NextResponse.json({ error: 'Failed to upload galley proof file' }, { status: 500 });
      }
    }

    // Create copy editing review object
    const copyEditReview = {
      copyEditorId: session.user.id,
      copyEditorName: session.user.name,
      copyEditorEmail: session.user.email,
      comments,
      galleyProofUrl,
      galleyProofPublicId,
      galleyProofFilename: galleyProofFile?.name,
      completionStatus,
      submittedAt: new Date(),
      stage: 'copy-edit-review'
    };

    // Update manuscript status based on completion status
    let newStatus = manuscript.status;
    let newCopyEditingStage = manuscript.copyEditingStage;

    if (completionStatus === 'completed') {
      newStatus = 'copy-edit-complete-author-review';
      newCopyEditingStage = 'author-review';
    } else if (completionStatus === 'needs-revision') {
      newStatus = 'copy-edit-needs-revision';
      newCopyEditingStage = 'revision-required';
    }

    // Update manuscript
    const updateData = {
      copyEditReview,
      status: newStatus,
      copyEditingStage: newCopyEditingStage,
      copyEditingCompletedDate: new Date(),
      lastModified: new Date(),
      $push: {
        timeline: {
          event: 'copy-edit-review-submitted',
          description: `Copy editing review submitted with status: ${completionStatus}`,
          performedBy: session.user.id,
          metadata: {
            copyEditorName: session.user.name,
            completionStatus,
            hasGalleyProof: !!galleyProofUrl,
            commentsLength: comments.length
          }
        }
      }
    };

    console.log('Copy edit review update data:', updateData); // Debug log

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy assignedCopyEditor', 'name email');

    console.log('Updated manuscript copyEditReview:', updatedManuscript.copyEditReview); // Debug log

    // Send notification to author
    try {
      await notifyAuthorCopyEditComplete(
        manuscript.submittedBy.email,
        params.id,
        manuscript.title,
        session.user.name || 'Copy Editor',
        completionStatus,
        !!galleyProofUrl
      );
    } catch (emailError) {
      console.log('Email notification failed (non-critical):', emailError);
    }

    return NextResponse.json({
      message: 'Copy editing review submitted successfully',
      manuscript: {
        _id: updatedManuscript._id,
        status: updatedManuscript.status,
        copyEditingStage: updatedManuscript.copyEditingStage,
        copyEditReview: updatedManuscript.copyEditReview
      }
    });

  } catch (error: any) {
    console.error('Error submitting copy edit review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/manuscripts/[id]/copy-edit-review - Get copy editing review status
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
      .populate('assignedCopyEditor', 'name email')
      .select('copyEditReview copyEditingStage status assignedCopyEditor submittedBy');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check permissions - copy editor, author, or admin can view
    const isAuthor = manuscript.submittedBy?.toString() === session.user.id;
    const isCopyEditor = manuscript.assignedCopyEditor?._id?.toString() === session.user.id;
    const isAdmin = session.user.roles?.includes('admin');

    if (!isAuthor && !isCopyEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({
      copyEditReview: manuscript.copyEditReview,
      copyEditingStage: manuscript.copyEditingStage,
      status: manuscript.status,
      assignedCopyEditor: manuscript.assignedCopyEditor
    });

  } catch (error) {
    console.error('Error fetching copy edit review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
