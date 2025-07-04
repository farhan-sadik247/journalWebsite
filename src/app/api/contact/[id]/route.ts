import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ContactMessage from '@/models/ContactMessage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = session.user.role === 'admin' || 
                   session.user.roles?.includes('admin') || 
                   session.user.isFounder;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const { status, adminResponse } = body;

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
    }
    
    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.respondedBy = session.user.id;
      updateData.respondedAt = new Date();
    }

    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('respondedBy', 'name email');

    if (!updatedMessage) {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Contact message updated successfully',
      contactMessage: updatedMessage,
    });

  } catch (error) {
    console.error('Error updating contact message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
