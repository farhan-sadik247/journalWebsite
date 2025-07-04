import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// Create a schema for storing designations with roles
let Designation: any;
try {
  // Use existing model if it exists
  Designation = mongoose.model('Designation');
} catch (error) {
  // Create new model if it doesn't exist
  const designationSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    roles: [{
      name: {
        type: String,
        required: true,
        trim: true
      }
    }]
  }, {
    timestamps: true,
  });
  
  Designation = mongoose.model('Designation', designationSchema);
}

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all designations
    const designations = await Designation.find()
      .sort({ name: 1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      designations,
    });
  } catch (error) {
    console.error('Error fetching designations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch designations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Parse request body
    const body = await request.json();
    
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Designation name is required' },
        { status: 400 }
      );
    }

    // Create new designation with optional roles
    const designationData: any = {
      name: body.name.trim(),
      description: body.description?.trim() || ''
    };
    
    // Add roles if provided
    if (body.roles && Array.isArray(body.roles)) {
      designationData.roles = body.roles.map((role: string) => ({ name: role.trim() }));
    }

    // Create new designation
    const designation = await Designation.create(designationData);
    
    return NextResponse.json({
      success: true,
      message: 'Designation created successfully',
      designation,
    });
  } catch (error) {
    console.error('Error creating designation:', error);
    
    // Handle duplicate key error
    if (error instanceof Error && 'code' in (error as any) && (error as any).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Designation already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create designation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Get designation ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required' },
        { status: 400 }
      );
    }

    // Delete the designation
    const result = await Designation.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Designation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting designation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete designation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
