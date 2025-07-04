import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function DELETE(
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
    
    // Find user and remove designation
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove designation and role
    user.designation = '';
    user.designationRole = '';

    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Editorial board assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing editorial board assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove editorial board assignment'
      },
      { status: 500 }
    );
  }
}
