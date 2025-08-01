import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import User from '@/models/User';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

// GET /api/categories/[id] - Get specific category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const category = await Category.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin or editor
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: Admin or Editor access required' }, { status: 403 });
    }

    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const details = formData.get('details') as string;
    const imageFile = formData.get('image') as File | null;
    const order = formData.get('order') as string;
    const isActive = formData.get('isActive') === 'true';

    if (!name || !details) {
      return NextResponse.json({ error: 'Name and details are required' }, { status: 400 });
    }

    // Check if another category with this name exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: params.id }
    });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    // Update category data
    const updateData: any = {
      name: name.trim(),
      details: details.trim(),
      order: order ? parseInt(order) : category.order,
      isActive,
      updatedBy: user._id,
    };

    // If new image is provided, upload it and delete old one
    if (imageFile && imageFile.size > 0) {
      try {
        // Delete old image locally
        if (category.image.publicId) {
          await deleteFromStorage(category.image.publicId);
        }

        // Upload new image locally
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadResult = await uploadToStorage(buffer, imageFile.name, 'categories');

        updateData.image = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          altText: `${name} category image`,
        };
      } catch (imageError) {
        console.error('Error uploading image:', imageError);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    return NextResponse.json({ category: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin or editor
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: Admin or Editor access required' }, { status: 403 });
    }

    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete image locally
    if (category.image.publicId) {
      try {
        await deleteFromStorage(category.image.publicId);
      } catch (imageError) {
        console.error('Error deleting image locally:', imageError);
        // Continue with category deletion even if image deletion fails
      }
    }

    // Delete category
    await Category.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
