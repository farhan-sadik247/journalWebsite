import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectDB from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a copy editor
    const userRole = session.user.currentActiveRole || session.user.role;
    const userRoles = session.user.roles || [userRole];
    
    if (!userRoles.includes('copy-editor')) {
      return NextResponse.json({ error: 'Access denied. Copy editor role required.' }, { status: 403 });
    }

    await connectDB();

    // Get manuscripts assigned to this copy editor
    const manuscripts = await Manuscript.find({
      'copyEditorAssignment.copyEditorId': session.user.id,
    })
    .populate('authors', 'name email affiliation')
    .populate('copyEditorAssignment.assignedBy', 'name email')
    .select(
      'title abstract status category submissionDate authors ' +
      'copyEditingStage copyEditorAssignment copyEditReview authorCopyEditReview ' +
      'lastModified'
    )
    .sort({ 'copyEditorAssignment.assignedDate': -1 });

    // Format the manuscripts for the response
    const formattedManuscripts = manuscripts.map(manuscript => ({
      _id: manuscript._id,
      title: manuscript.title,
      abstract: manuscript.abstract,
      status: manuscript.status,
      category: manuscript.category,
      submissionDate: manuscript.submissionDate,
      lastModified: manuscript.lastModified,
      authors: manuscript.authors,
      copyEditingStage: manuscript.copyEditingStage,
      assignment: {
        assignedDate: manuscript.copyEditorAssignment?.assignedDate,
        dueDate: manuscript.copyEditorAssignment?.dueDate,
        status: manuscript.copyEditorAssignment?.status,
        notes: manuscript.copyEditorAssignment?.notes,
        assignedBy: manuscript.copyEditorAssignment?.assignedBy,
        completedDate: manuscript.copyEditorAssignment?.completedDate,
        authorApprovalDate: manuscript.copyEditorAssignment?.authorApprovalDate,
      },
      copyEditReview: manuscript.copyEditReview,
      authorCopyEditReview: manuscript.authorCopyEditReview,
    }));

    return NextResponse.json({
      manuscripts: formattedManuscripts,
      total: formattedManuscripts.length,
    });

  } catch (error) {
    console.error('Error fetching copy editor manuscripts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch assigned manuscripts' 
    }, { status: 500 });
  }
}
