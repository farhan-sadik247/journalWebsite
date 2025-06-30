import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { 
  notifyAuthorGalleyReview
} from '@/lib/notificationUtils';

// POST /api/manuscripts/[id]/submit-galley-proof - Copy editor submits galley proof
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only copy editors and admins can submit galley proofs
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { galleyProofs, notes } = await request.json();

    if (!galleyProofs || !Array.isArray(galleyProofs) || galleyProofs.length === 0) {
      return NextResponse.json({ error: 'At least one galley proof file is required' }, { status: 400 });
    }

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id)
      .populate('submittedBy', 'name email')
      .populate('copyEditorAssignment.assignedBy', 'name email');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if this copy editor is assigned to this manuscript
    if (manuscript.copyEditorAssignment?.copyEditorId?.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
    }

    // Check if assignment is in valid state for galley submission
    const validStatuses = ['assigned', 'in-progress'];
    if (!validStatuses.includes(manuscript.copyEditorAssignment?.status || '')) {
      return NextResponse.json({ 
        error: 'Manuscript is not in a valid state for galley proof submission' 
      }, { status: 400 });
    }

    // Update manuscript with galley proofs
    const updateData = {
      lastModified: new Date(),
      'copyEditorAssignment.galleyProofs': galleyProofs,
      'copyEditorAssignment.galleySubmissionDate': new Date(),
      'copyEditorAssignment.galleyNotes': notes || '',
      'copyEditorAssignment.status': 'galley-submitted',
      'copyEditorAssignment.completedDate': new Date(),
      $push: {
        timeline: {
          event: 'galley-proof-submitted',
          description: 'Copy editor submitted galley proofs for author review',
          performedBy: session.user.id,
          metadata: {
            copyEditorName: session.user.name,
            galleyCount: galleyProofs.length,
            notes: notes || '',
            galleyFiles: galleyProofs.map((file: any) => ({
              filename: file.filename,
              type: file.type,
              size: file.size
            }))
          }
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy', 'name email')
     .populate('copyEditorAssignment.assignedBy', 'name email');

    // Notify author that galley proofs are ready for review
    if (updatedManuscript.submittedBy) {
      await notifyAuthorGalleyReview(
        updatedManuscript.submittedBy.email,
        params.id,
        updatedManuscript.title,
        session.user.name || 'Copy Editor',
        galleyProofs.length,
        notes
      );
    }

    return NextResponse.json({
      message: 'Galley proofs submitted successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error submitting galley proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/manuscripts/[id]/submit-galley-proof - Update galley proof submission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only copy editors and admins can update galley proofs
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { galleyProofs, notes } = await request.json();

    await dbConnect();

    const manuscript = await Manuscript.findById(params.id);

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Check if this copy editor is assigned to this manuscript
    if (manuscript.copyEditorAssignment?.copyEditorId?.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'You are not assigned to this manuscript' }, { status: 403 });
    }

    // Update galley proofs and notes
    const updateData: any = {
      lastModified: new Date(),
    };

    if (galleyProofs) {
      updateData['copyEditorAssignment.galleyProofs'] = galleyProofs;
    }

    if (notes !== undefined) {
      updateData['copyEditorAssignment.galleyNotes'] = notes;
    }

    updateData.$push = {
      timeline: {
        event: 'galley-proof-updated',
        description: 'Copy editor updated galley proofs',
        performedBy: session.user.id,
        metadata: {
          copyEditorName: session.user.name,
          notes: notes || ''
        }
      }
    };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      message: 'Galley proofs updated successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error updating galley proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
