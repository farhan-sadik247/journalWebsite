import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Category from '@/models/Category';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';
import { uploadToStorage } from '@/lib/storage';

// Define the lean category type
type LeanCategory = {
  _id: mongoose.Types.ObjectId;
  name: string;
  details: string;
  image?: {
    url: string;
    publicId: string;
    altText: string;
  } | null;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  articleCount?: number;
};

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
    const name = formData.get('name') as string;
    const details = formData.get('details') as string;
    const imageFile = formData.get('image') as File;
    const order = parseInt(formData.get('order') as string) || 0;
    const isActive = formData.get('isActive') === 'true';

    if (!name || !details) {
      return NextResponse.json(
        { error: 'Name and details are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    let imageData = null;
    if (imageFile) {
      // Convert file to buffer
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      
      // Upload to storage
      const uploadResult = await uploadToStorage(buffer, imageFile.name, 'categories');
      
      imageData = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        altText: name
      };
    }

    const category = await Category.create({
      name,
      details,
      image: imageData,
      order,
      isActive,
      createdBy: new mongoose.Types.ObjectId(session.user.id)
    });

    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const sortByArticleCount = searchParams.get('sortByArticleCount') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0');

    // Build query
    let query = activeOnly ? { isActive: true } : {};

    // Get categories
    let categories = await Category.find(query)
      .sort('order')
      .select('-__v')
      .lean<LeanCategory[]>();

    // Get article counts for each category
    const articleCounts = await Manuscript.aggregate([
      {
        $match: {
          $or: [
            { status: 'published' },
            { status: 'ready-for-publication' },
            { status: 'in-production' }
          ]
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of category to count
    const countMap = new Map(articleCounts.map(item => [item._id, item.count]));

    // Add article count to each category
    categories = categories.map(category => ({
      ...category,
      articleCount: countMap.get(category.name) || 0
    }));

    // Sort by article count if requested
    if (sortByArticleCount) {
      categories.sort((a, b) => (b.articleCount || 0) - (a.articleCount || 0));
    }

    // If limit is specified and valid, apply it
    if (limit > 0) {
      categories = categories.slice(0, limit);
    }

    return NextResponse.json({ categories });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
