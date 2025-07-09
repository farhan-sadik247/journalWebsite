import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import { uploadToStorage } from '@/lib/storage';
import { sendEmail, emailTemplates } from '@/lib/email';
import { transformAuthorForDatabase } from '@/lib/manuscriptUtils';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Extract form fields
    const title = formData.get('title') as string;
    const abstract = formData.get('abstract') as string;
    const keywords = JSON.parse(formData.get('keywords') as string);
    const authorsFromForm = JSON.parse(formData.get('authors') as string);
    const correspondingAuthor = formData.get('correspondingAuthor') as string;

    // Map authors from { firstName, lastName } format to { name } format for database compatibility
    const authors = authorsFromForm.map(transformAuthorForDatabase);
    const category = formData.get('category') as string;
    const funding = formData.get('funding') as string || '';
    const conflictOfInterest = formData.get('conflictOfInterest') as string || '';
    const ethicsStatement = formData.get('ethicsStatement') as string || '';
    const dataAvailability = formData.get('dataAvailability') as string || '';
    const reviewerSuggestions = JSON.parse(formData.get('reviewerSuggestions') as string || '[]');

    // Validate required fields
    if (!title || !abstract || !keywords.length || !authors.length || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle file uploads
    const files = formData.getAll('files') as File[];
    const uploadedFiles = [];

    console.log('Processing files for upload:', files.length, 'files');

    for (const file of files) {
      if (file.size > 0) {
        console.log('Uploading file:', file.name, 'size:', file.size);
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const uploadResult = await uploadToStorage(
            buffer, 
            file.name,
            `manuscripts/${Date.now()}`
          );
          
          console.log('Upload successful:', uploadResult.public_id, 'URL:', uploadResult.secure_url);
          
          uploadedFiles.push({
            filename: uploadResult.public_id,
            originalName: file.name,
            storageId: uploadResult.public_id,
            cloudinaryId: uploadResult.public_id,
            url: uploadResult.secure_url,
            type: 'manuscript',
            size: uploadResult.bytes,
            version: 1,
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

    console.log('Total uploaded files:', uploadedFiles.length);

    await dbConnect();

    // Create manuscript
    const manuscript = await Manuscript.create({
      title,
      abstract,
      keywords,
      authors,
      correspondingAuthor,
      submittedBy: new mongoose.Types.ObjectId(session.user.id),
      files: uploadedFiles,
      category,
      funding,
      conflictOfInterest,
      ethicsStatement,
      dataAvailability,
      reviewerSuggestions,
      timeline: [{
        event: 'submitted',
        description: 'Manuscript submitted for review',
        performedBy: new mongoose.Types.ObjectId(session.user.id),
      }],
    });

    // Send confirmation email
    try {
      const emailContent = emailTemplates.manuscriptSubmitted(
        session.user.name,
        title,
        manuscript._id.toString()
      );
      
      await sendEmail({
        to: session.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json(
      {
        message: 'Manuscript submitted successfully',
        manuscript: {
          id: manuscript._id,
          title: manuscript.title,
          status: manuscript.status,
          submissionDate: manuscript.submissionDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Manuscript submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('GET manuscripts - User session:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      currentActiveRole: session.user.currentActiveRole,
      roles: session.user.roles
    });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const editor = searchParams.get('editor'); // For editor dashboard
    const copyEditing = searchParams.get('copyEditing'); // For copy-editor dashboard
    const admin = searchParams.get('admin'); // For admin manuscript management

    await dbConnect();

    // Build filter based on user role - using multi-role logic
    const filter: Record<string, any> = {};
    const userRole = session.user.currentActiveRole || session.user.role || 'author';
    const userRoles = session.user.roles || [userRole];
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isReviewer = userRole === 'reviewer' || userRoles.includes('reviewer');
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    
    if (userRole === 'author' && !editor && !copyEditing && !admin) {
      filter.submittedBy = new mongoose.Types.ObjectId(session.user.id);
      console.log('Author filter applied - submittedBy:', session.user.id, 'as ObjectId:', filter.submittedBy);
    } else if (isReviewer && !editor && !copyEditing && !isEditor && !isAdmin && !admin) {
      // Reviewers can only see:
      // 1. Manuscripts assigned to them for review
      // 2. Published manuscripts
      
      // Get manuscripts assigned to this reviewer
      const assignedReviews = await Review.find({ 
        reviewerId: new mongoose.Types.ObjectId(session.user.id) 
      }).select('manuscriptId').lean();
      
      const assignedManuscriptIds = assignedReviews.map(review => review.manuscriptId);
      
      filter.$or = [
        { _id: { $in: assignedManuscriptIds } }, // Assigned manuscripts
        { status: 'published' } // Published manuscripts
      ];
      console.log('Reviewer filter applied - assigned manuscripts:', assignedManuscriptIds.length, 'manuscripts + published');
    } else if (isCopyEditor && (!isEditor && !isAdmin)) {
      // Copy editors can only see:
      // 1. Manuscripts assigned to them for copy editing (any role context)
      // 2. Published manuscripts
      
      filter.$or = [
        { 
          $or: [
            { assignedCopyEditor: new mongoose.Types.ObjectId(session.user.id) },
            { 'copyEditorAssignment.copyEditorId': new mongoose.Types.ObjectId(session.user.id) }
          ]
        }, // Assigned manuscripts (both old and new assignment structure)
        { status: 'published' } // Published manuscripts
      ];
      console.log('Copy-editor filter applied - showing only assigned manuscripts + published for user:', session.user.id);
    } else if ((isEditor || isAdmin) || editor || admin) {
      // Editors and admins see all manuscripts
      // Admin parameter specifically allows admin access to all manuscripts for management
      if (admin && !isAdmin) {
        return NextResponse.json(
          { error: 'Insufficient permissions. Admin access required.' },
          { status: 403 }
        );
      }
      console.log('Editor/Admin filter applied - showing all manuscripts');
    }

    // Add additional filters
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Add copyEditingStage filter
    const copyEditingStage = searchParams.get('copyEditingStage');
    if (copyEditingStage) {
      filter.copyEditingStage = copyEditingStage;
    }
    
    // Add unassigned filter for article assignment
    const unassigned = searchParams.get('unassigned');
    if (unassigned === 'true') {
      filter.$and = [
        { $or: [{ issue: { $exists: false } }, { issue: null }] },
        { $or: [{ volume: { $exists: false } }, { volume: null }] }
      ];
    }

    // Add search query filter
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { abstract: { $regex: query, $options: 'i' } },
        { keywords: { $regex: query, $options: 'i' } },
        { 'authors.name': { $regex: query, $options: 'i' } }
      ];
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Manuscript.countDocuments(filter);

    // Get manuscripts with pagination
    const manuscripts = await Manuscript.find(filter)
      .sort({ submissionDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('submittedBy', 'name email')
      .populate('assignedEditor', 'name email')
      .populate('assignedCopyEditor', 'name email')
      .lean();

    return NextResponse.json({
      manuscripts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching manuscripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manuscripts' },
      { status: 500 }
    );
  }
}
