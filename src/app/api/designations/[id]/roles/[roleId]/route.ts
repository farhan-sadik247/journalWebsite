import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Designation from '@/models/Designation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } }
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
    
    const { id, roleId } = params;
    
    // Find the designation and remove the role
    const designation = await Designation.findById(id);
    
    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }

    // Remove the role
    const initialLength = designation.roles.length;
    designation.roles = designation.roles.filter((role: any) => 
      role._id.toString() !== roleId
    );

    if (designation.roles.length === initialLength) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    await designation.save();
    
    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete role'
      },
      { status: 500 }
    );
  }
}
