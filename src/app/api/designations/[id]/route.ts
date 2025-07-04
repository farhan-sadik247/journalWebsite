import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Designation from '@/models/Designation';

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
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting designation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete designation'
      },
      { status: 500 }
    );
  }
}
