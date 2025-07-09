import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';
import { uploadToStorage } from '@/lib/storage';

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

    // Get all volumes with their issues and populate manuscripts
    const volumes = await Volume.find({})
      .populate('issues.manuscripts', 'title authors status')
      .sort({ year: -1, number: -1 });

    // Flatten issues from all volumes
    const issues = volumes.flatMap(volume => 
      volume.issues.map((issue: any) => ({
        ...issue.toObject(),
        volume: {
          _id: volume._id,
          number: volume.number,
          year: volume.year,
          title: volume.title
        }
      }))
    );

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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has editor or admin role in either role or roles array
    const userRole = session.user.role;
    const userRoles = session.user.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    const formData = await request.formData();
    const volumeId = formData.get('volumeId') as string;
    const number = parseInt(formData.get('number') as string);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const editorialNote = formData.get('editorialNote') as string;
    const status = formData.get('status') as string;
    const publishDate = formData.get('publishDate') as string;
    const coverImageFile = formData.get('coverImage') as File;

    // Validate required fields
    if (!volumeId || !number || !title) {
      return NextResponse.json(
        { error: 'Volume ID, number, and title are required' },
        { status: 400 }
      );
    }

    // Find the volume
    const volume = await Volume.findById(volumeId);
    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    // Check issue limit (3-4 issues per volume)
    if (volume.issues.length >= 4) {
      return NextResponse.json(
        { error: 'Maximum of 4 issues per volume allowed' },
        { status: 400 }
      );
    }

    // Check if issue number already exists for this volume
    const existingIssue = volume.issues.find((issue: any) => issue.number === number);
    if (existingIssue) {
      return NextResponse.json(
        { error: `Issue ${number} already exists for this volume` },
        { status: 400 }
      );
    }

    // Prepare issue data
    const issueData: any = {
      number,
      title,
      description: description || '',
      editorialNote: editorialNote || '',
      isPublished: status === 'published',
    };

    // Handle cover image upload
    if (coverImageFile) {
      const buffer = Buffer.from(await coverImageFile.arrayBuffer());
      const uploadResult = await uploadToStorage(
        buffer,
        coverImageFile.name,
        'journal/covers'
      );

      issueData.coverImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: coverImageFile.name
      };
    }

    // Handle publish date
    if (publishDate) {
      issueData.publishedDate = new Date(publishDate);
    }

    // Add the issue to the volume
    volume.issues.push(issueData);
    volume.lastModifiedBy = session.user.id;
    
    await volume.save();

    // Get the newly created issue
    const newIssue = volume.issues[volume.issues.length - 1];

    return NextResponse.json({
      message: 'Issue created successfully',
      issue: {
        ...newIssue.toObject(),
        volume: {
          _id: volume._id,
          number: volume.number,
          year: volume.year,
          title: volume.title
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
