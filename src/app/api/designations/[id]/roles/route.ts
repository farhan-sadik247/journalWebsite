import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Designation from '@/models/Designation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { id } = params;
    const { name, description } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Find the designation and add the new role
    const designation = await Designation.findById(id);
    
    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }

    // Check if role already exists in this designation
    const roleExists = designation.roles.some((role: any) => 
      role.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (roleExists) {
      return NextResponse.json(
        { success: false, error: 'Role already exists in this designation' },
        { status: 400 }
      );
    }

    // Add the new role
    designation.roles.push({
      name: name.trim(),
      description: description?.trim() || ''
    });

    await designation.save();
    
    return NextResponse.json({
      success: true,
      message: 'Role added successfully',
      designation
    });
  } catch (error) {
    console.error('Error adding role:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add role'
      },
      { status: 500 }
    );
  }
}
