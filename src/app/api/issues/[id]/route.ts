import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const issueId = params.id;

    // Find the volume that contains this issue
    const volume = await Volume.findOne({
      'issues._id': issueId
    }).populate('issues.manuscripts', 'title authors status');

    if (!volume) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Find the specific issue
    const issue = volume.issues.id(issueId);
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Return the issue with volume information
    const issueData = {
      ...issue.toObject(),
      volume: {
        _id: volume._id,
        number: volume.number,
        year: volume.year,
        title: volume.title
      }
    };

    return NextResponse.json({
      issue: issueData
    });

  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // Find the volume and issue
    const volume = await Volume.findById(volumeId);
    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    const issueIndex = volume.issues.findIndex((issue: any) => issue._id.toString() === params.id);
    if (issueIndex === -1) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Check if new issue number conflicts with another issue in the same volume
    const existingIssue = volume.issues.find((issue: any) => 
      issue.number === number && issue._id.toString() !== params.id
    );
    if (existingIssue) {
      return NextResponse.json(
        { error: `Issue ${number} already exists for this volume` },
        { status: 400 }
      );
    }

    // Handle cover image
    let coverImageData = volume.issues[issueIndex].coverImage;
    if (coverImageFile) {
      // Delete old cover image if it exists
      if (volume.issues[issueIndex].coverImage?.publicId) {
        await deleteFromStorage(volume.issues[issueIndex].coverImage.publicId);
      }

      // Upload new cover image
      const buffer = Buffer.from(await coverImageFile.arrayBuffer());
      const uploadResult = await uploadToStorage(
        buffer,
        coverImageFile.name,
        'journal/covers'
      );

      coverImageData = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: coverImageFile.name
      };
    }

    // Update issue data
    volume.issues[issueIndex] = {
      ...volume.issues[issueIndex].toObject(),
      number,
      title,
      description: description || '',
      editorialNote: editorialNote || '',
      isPublished: status === 'published',
      publishedDate: publishDate ? new Date(publishDate) : volume.issues[issueIndex].publishedDate,
      coverImage: coverImageData,
      lastModifiedBy: session.user.id,
      lastModifiedAt: new Date()
    };

    await volume.save();

    return NextResponse.json({
      message: 'Issue updated successfully',
      issue: {
        ...volume.issues[issueIndex].toObject(),
        volume: {
          _id: volume._id,
          number: volume.number,
          year: volume.year,
          title: volume.title
        }
      }
    });

  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    await dbConnect();

    // Find the volume containing the issue
    const volume = await Volume.findOne({ 'issues._id': params.id });
    if (!volume) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const issueIndex = volume.issues.findIndex((issue: any) => issue._id.toString() === params.id);
    if (issueIndex === -1) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Delete cover image from Cloudinary if it exists
    if (volume.issues[issueIndex].coverImage?.publicId) {
      await deleteFromStorage(volume.issues[issueIndex].coverImage.publicId);
    }

    // Remove the issue from the volume
    volume.issues.splice(issueIndex, 1);
    await volume.save();

    return NextResponse.json({
      message: 'Issue deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
