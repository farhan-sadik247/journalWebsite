import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// Create Issue schema and model
const issueSchema = new mongoose.Schema({
  volumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volume',
    required: true,
  },
  number: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'published', 'archived'],
    default: 'draft',
  },
  publishedDate: {
    type: Date,
  },
  manuscripts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure unique issue number per volume
issueSchema.index({ volumeId: 1, number: 1 }, { unique: true });

const Issue = mongoose.models.Issue || mongoose.model('Issue', issueSchema);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const issues = await Issue.find({})
      .populate('volumeId', 'number year title')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      issues,
      total: issues.length
    });

  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { volumeId, number, title, description, status } = body;

    // Validate required fields
    if (!volumeId || !number || !title) {
      return NextResponse.json(
        { error: 'Volume ID, number, and title are required' },
        { status: 400 }
      );
    }

    // Check if issue number already exists for this volume
    const existingIssue = await Issue.findOne({ volumeId, number });
    if (existingIssue) {
      return NextResponse.json(
        { error: `Issue ${number} already exists for this volume` },
        { status: 400 }
      );
    }

    const issue = new Issue({
      volumeId,
      number: parseInt(number),
      title,
      description: description || '',
      status: status || 'draft',
    });

    await issue.save();

    // Populate the volume data for response
    await issue.populate('volumeId', 'number year title');

    return NextResponse.json({
      message: 'Issue created successfully',
      issue
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
