import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import UserManual from '@/models/UserManual';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const type = formData.get('type') as string;
    const heading = formData.get('heading') as string;
    const content = formData.get('content') as string;
    const order = parseInt(formData.get('order') as string) || 0;
    const imageFile = formData.get('image') as File;

    if (!type || !heading || !content) {
      return NextResponse.json(
        { error: 'Type, heading, and content are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    let imageData = null;
    if (imageFile) {
      // Convert file to buffer
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      
      // Upload to storage
      const uploadResult = await uploadToStorage(buffer, imageFile.name, 'user-manual');
      
      imageData = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    }

    const userManual = await UserManual.create({
      type,
      heading,
      content,
      order,
      image: imageData
    });

    return NextResponse.json(userManual, { status: 201 });

  } catch (error) {
    console.error('Error creating user manual:', error);
    return NextResponse.json(
      { error: 'Failed to create user manual' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const type = formData.get('type') as string;
    const heading = formData.get('heading') as string;
    const content = formData.get('content') as string;
    const order = parseInt(formData.get('order') as string) || 0;
    const imageFile = formData.get('image') as File;

    if (!id || !type || !heading || !content) {
      return NextResponse.json(
        { error: 'ID, type, heading, and content are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingManual = await UserManual.findById(id);
    if (!existingManual) {
      return NextResponse.json(
        { error: 'User manual not found' },
        { status: 404 }
      );
    }

    let imageData = existingManual.image;
    if (imageFile) {
      // Delete old image if it exists
      if (existingManual.image?.publicId) {
        await deleteFromStorage(existingManual.image.publicId);
      }

      // Convert file to buffer
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      
      // Upload to storage
      const uploadResult = await uploadToStorage(buffer, imageFile.name, 'user-manual');
      
      imageData = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    }

    const updatedManual = await UserManual.findByIdAndUpdate(
      id,
      {
        type,
        heading,
        content,
        order,
        image: imageData
      },
      { new: true }
    );

    return NextResponse.json(updatedManual);

  } catch (error) {
    console.error('Error updating user manual:', error);
    return NextResponse.json(
      { error: 'Failed to update user manual' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const manuals = await UserManual.find()
      .sort('order')
      .select('-__v')
      .lean();
    
    return NextResponse.json(manuals);
    
  } catch (error) {
    console.error('Error fetching user manuals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user manuals' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const manual = await UserManual.findById(id);
    if (!manual) {
      return NextResponse.json(
        { error: 'User manual not found' },
        { status: 404 }
      );
    }

    // Delete associated image if it exists
    if (manual.image?.publicId) {
      await deleteFromStorage(manual.image.publicId);
    }

    await UserManual.findByIdAndDelete(id);

    return NextResponse.json({ message: 'User manual deleted successfully' });

  } catch (error) {
    console.error('Error deleting user manual:', error);
    return NextResponse.json(
      { error: 'Failed to delete user manual' },
      { status: 500 }
    );
  }
}
