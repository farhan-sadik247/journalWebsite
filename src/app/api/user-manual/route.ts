import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectDB from '@/lib/mongodb';
import UserManual from '@/models/UserManual';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const userManualItems = await UserManual.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 });
    
    return NextResponse.json({
      success: true,
      userManualItems,
    });
  } catch (error) {
    console.error('Error fetching user manual items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user manual items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const heading = formData.get('heading') as string;
    const content = formData.get('content') as string;
    const order = parseInt(formData.get('order') as string) || 0;
    const imageFile = formData.get('image') as File;

    if (!type || !heading) {
      return NextResponse.json(
        { success: false, error: 'Type and heading are required' },
        { status: 400 }
      );
    }

    let userManualData: any = {
      type,
      heading,
      order,
    };

    if (type === 'text') {
      if (!content) {
        return NextResponse.json(
          { success: false, error: 'Content is required for text type' },
          { status: 400 }
        );
      }
      userManualData.content = content;
    } else if (type === 'image') {
      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: 'Image file is required for image type' },
          { status: 400 }
        );
      }

      // Upload image to Cloudinary
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'user-manual',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      const cloudinaryResult = uploadResponse as any;
      userManualData.content = content || 'Image content'; // Provide default content for images
      userManualData.imageUrl = cloudinaryResult.secure_url;
    }

    const userManualItem = new UserManual(userManualData);
    await userManualItem.save();

    return NextResponse.json({
      success: true,
      userManualItem,
      message: 'User manual item created successfully',
    });
  } catch (error) {
    console.error('Error creating user manual item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user manual item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const type = formData.get('type') as string;
    const heading = formData.get('heading') as string;
    const content = formData.get('content') as string;
    const order = parseInt(formData.get('order') as string) || 0;
    const imageFile = formData.get('image') as File;

    if (!id || !type || !heading) {
      return NextResponse.json(
        { success: false, error: 'ID, type, and heading are required' },
        { status: 400 }
      );
    }

    const existingItem = await UserManual.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'User manual item not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      type,
      heading,
      order,
    };

    if (type === 'text') {
      if (!content) {
        return NextResponse.json(
          { success: false, error: 'Content is required for text type' },
          { status: 400 }
        );
      }
      updateData.content = content;
      updateData.imageUrl = null; // Clear image URL if changing to text
    } else if (type === 'image') {
      updateData.content = content || 'Image content'; // Provide default content for images
      
      if (imageFile && imageFile.size > 0) {
        // Delete old image from Cloudinary if exists
        if (existingItem.imageUrl) {
          try {
            const publicId = existingItem.imageUrl.split('/').pop()?.split('.')[0];
            if (publicId) {
              await cloudinary.uploader.destroy(`user-manual/${publicId}`);
            }
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        // Upload new image to Cloudinary
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadResponse = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'user-manual',
              transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        const cloudinaryResult = uploadResponse as any;
        updateData.imageUrl = cloudinaryResult.secure_url;
      }
    }

    const updatedItem = await UserManual.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      userManualItem: updatedItem,
      message: 'User manual item updated successfully',
    });
  } catch (error) {
    console.error('Error updating user manual item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user manual item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const existingItem = await UserManual.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'User manual item not found' },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary if exists
    if (existingItem.imageUrl) {
      try {
        const publicId = existingItem.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`user-manual/${publicId}`);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    await UserManual.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User manual item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user manual item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user manual item' },
      { status: 500 }
    );
  }
}
