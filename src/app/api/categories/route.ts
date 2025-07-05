import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import Manuscript from '@/models/Manuscript';
import User from '@/models/User';
import { uploadToStorage } from '@/lib/storage';

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const sortByArticleCount = searchParams.get('sortByArticleCount') === 'true';

    const filter = activeOnly ? { isActive: true } : {};

    if (sortByArticleCount) {
      // Use aggregation to get categories with article counts and sort by article count
      const categories = await Category.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'manuscripts', // collection name in MongoDB (mongoose pluralizes models)
            localField: 'name',
            foreignField: 'category',
            as: 'articles',
            pipeline: [
              { $match: { status: 'published' } } // Only count published articles
            ]
          }
        },
        {
          $addFields: {
            articleCount: { $size: '$articles' }
          }
        },
        {
          $sort: { articleCount: -1, order: 1, name: 1 } // Sort by article count first, then order, then name
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
            pipeline: [{ $project: { name: 1, email: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'updatedBy',
            foreignField: '_id',
            as: 'updatedBy',
            pipeline: [{ $project: { name: 1, email: 1 } }]
          }
        },
        {
          $addFields: {
            createdBy: { $arrayElemAt: ['$createdBy', 0] },
            updatedBy: { $arrayElemAt: ['$updatedBy', 0] }
          }
        },
        {
          $project: {
            articles: 0 // Remove the articles array from the response, keep only the count
          }
        }
      ]);

      return NextResponse.json({ categories });
    } else {
      // Original behavior for backward compatibility
      const categories = await Category.find(filter)
        .sort({ order: 1, name: 1 })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      return NextResponse.json({ categories });
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const details = formData.get('details') as string;
    const imageFile = formData.get('image') as File;
    const order = formData.get('order') as string;

    if (!name || !details || !imageFile) {
      return NextResponse.json({ error: 'Name, details, and image are required' }, { status: 400 });
    }

    // Check if category with this name already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    // Upload image locally
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await uploadToStorage(buffer, imageFile.name, 'categories');

    // Create category
    const category = new Category({
      name: name.trim(),
      details: details.trim(),
      image: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        altText: `${name} category image`,
      },
      order: order ? parseInt(order) : 0,
      createdBy: user._id,
    });

    await category.save();

    const populatedCategory = await Category.findById(category._id)
      .populate('createdBy', 'name email');

    return NextResponse.json({ category: populatedCategory }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
