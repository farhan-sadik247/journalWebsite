import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// Get or create Designation model
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

// GET - Get all roles for a designation
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get designation ID from query params
    const url = new URL(request.url);
    const designationId = url.searchParams.get('id');
    
    if (!designationId) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required' },
        { status: 400 }
      );
    }
    
    const designation = await Designation.findById(designationId).lean();
    
    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      roles: designation.roles || []
    });
  } catch (error) {
    console.error('Error fetching designation roles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch designation roles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Add a role to a designation
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
    
    const body = await request.json();
    const { designationId, roleName } = body;
    
    if (!designationId) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required' },
        { status: 400 }
      );
    }
    
    if (!roleName || typeof roleName !== 'string' || !roleName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }
    
    const designation = await Designation.findById(designationId);
    
    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }
    
    // Initialize roles array if it doesn't exist
    if (!designation.roles) {
      designation.roles = [];
    }
    
    // Check if role already exists
    const roleExists = designation.roles.some((role: any) => 
      role.name.toLowerCase() === roleName.trim().toLowerCase()
    );
    
    if (roleExists) {
      return NextResponse.json(
        { success: false, error: 'Role already exists for this designation' },
        { status: 400 }
      );
    }
    
    // Add the new role
    designation.roles.push({ name: roleName.trim() });
    await designation.save();
    
    return NextResponse.json({
      success: true,
      message: 'Role added successfully',
      designation
    });
  } catch (error) {
    console.error('Error adding role to designation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add role to designation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove a role from a designation
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
    
    // Get params from query
    const url = new URL(request.url);
    const designationId = url.searchParams.get('designationId');
    const roleId = url.searchParams.get('roleId');
    
    if (!designationId || !roleId) {
      return NextResponse.json(
        { success: false, error: 'Designation ID and Role ID are required' },
        { status: 400 }
      );
    }
    
    const designation = await Designation.findById(designationId);
    
    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }
    
    // Remove the role by ID
    designation.roles = designation.roles.filter((role: any) => 
      role._id.toString() !== roleId
    );
    
    await designation.save();
    
    return NextResponse.json({
      success: true,
      message: 'Role removed successfully',
      designation
    });
  } catch (error) {
    console.error('Error removing role from designation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove role from designation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
