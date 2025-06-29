import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is copy-editor or admin
    if (session.user.role !== 'copy-editor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { stage, notes } = await request.json();

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 });
    }

    await connectToDatabase();

    const manuscript = await Manuscript.findById(params.id).populate('submittedBy authors.user');

    if (!manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    // Update manuscript with copy editing information
    const updateData: any = {
      copyEditingStage: stage,
      lastModified: new Date(),
    };

    // Add notes based on stage
    if (notes) {
      switch (stage) {
        case 'copy-editing':
          updateData.copyEditingNotes = notes;
          break;
        case 'typesetting':
          updateData.typesettingNotes = notes;
          break;
        case 'proofreading':
          updateData.proofreadingNotes = notes;
          break;
        default:
          updateData.productionNotes = notes;
      }
    }

    // Update status if manuscript is ready for publication
    if (stage === 'ready-for-publication') {
      updateData.status = 'in-production';
    }

    // Add timeline event
    const timelineEvent = {
      event: `Production Stage Updated: ${stage.replace('-', ' ')}`,
      description: notes || `Manuscript moved to ${stage.replace('-', ' ')} stage`,
      date: new Date(),
      updatedBy: session.user.id
    };

    updateData.$push = { timeline: timelineEvent };

    const updatedManuscript = await Manuscript.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('submittedBy authors.user');

    // Send notification email based on stage
    let emailSubject = '';
    let emailContent = '';
    let recipients: string[] = [];

    switch (stage) {
      case 'author-review':
        emailSubject = `Copy-edited version ready for review - ${manuscript.title}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Copy-edited Version Ready for Review</h2>
            <p>Dear Author(s),</p>
            
            <p>The copy-edited version of your manuscript "<strong>${manuscript.title}</strong>" is now ready for your review.</p>
            
            <p>Please review the copy-edited version and provide your feedback or approval. You can access your manuscript through your dashboard.</p>
            
            ${notes ? `<p><strong>Copy Editor Notes:</strong><br>${notes}</p>` : ''}
            
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/manuscripts/${manuscript._id}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               View Manuscript
            </a></p>
            
            <p>Best regards,<br>Editorial Team</p>
          </div>
        `;
        recipients = manuscript.authors.map((author: any) => author.email);
        break;

      case 'ready-for-publication':
        emailSubject = `Manuscript ready for publication - ${manuscript.title}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Manuscript Ready for Publication</h2>
            <p>Dear Editorial Team,</p>
            
            <p>The manuscript "<strong>${manuscript.title}</strong>" has completed the production process and is ready for publication.</p>
            
            <p>All copy editing, proofreading, and typesetting stages have been completed successfully.</p>
            
            ${notes ? `<p><strong>Final Notes:</strong><br>${notes}</p>` : ''}
            
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/copy-editor/manuscripts/${manuscript._id}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               View Manuscript
            </a></p>
            
            <p>Best regards,<br>Production Team</p>
          </div>
        `;
        
        // Send to editors
        const editors = await User.find({ role: 'editor' });
        recipients = editors.map(editor => editor.email);
        break;
    }

    // Send emails if there are recipients
    if (recipients.length > 0 && emailSubject) {
      for (const email of recipients) {
        try {
          await sendEmail({
            to: email,
            subject: emailSubject,
            html: emailContent,
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
        }
      }
    }

    return NextResponse.json({
      message: 'Copy editing stage updated successfully',
      manuscript: updatedManuscript
    });

  } catch (error) {
    console.error('Error updating copy editing stage:', error);
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

    // Return copy editing specific information
    const copyEditingInfo = {
      _id: manuscript._id,
      title: manuscript.title,
      status: manuscript.status,
      copyEditingStage: manuscript.copyEditingStage,
      productionStage: manuscript.productionStage,
      assignedCopyEditor: manuscript.assignedCopyEditor,
      copyEditingDueDate: manuscript.copyEditingDueDate,
      copyEditingNotes: manuscript.copyEditingNotes,
      typesettingNotes: manuscript.typesettingNotes,
      proofreadingNotes: manuscript.proofreadingNotes,
      productionNotes: manuscript.productionNotes,
      timeline: manuscript.timeline
    };

    return NextResponse.json({
      copyEditingInfo
    });

  } catch (error) {
    console.error('Error fetching copy editing info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
