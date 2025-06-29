import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';

// PATCH /api/notifications/bulk - Bulk update notifications
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find the current user to get their ObjectId
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { action, notificationIds } = await request.json();

    if (action === 'markAllRead') {
      // Mark all notifications as read for the user
      const result = await Notification.updateMany(
        { 
          recipient: currentUser._id,
          isRead: false
        },
        { 
          isRead: true,
          readAt: new Date()
        }
      );

      return NextResponse.json({
        message: 'All notifications marked as read',
        modifiedCount: result.modifiedCount
      });
    }

    if (action === 'markMultipleRead' && notificationIds) {
      // Mark specific notifications as read
      const result = await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          recipient: currentUser._id
        },
        {
          isRead: true,
          readAt: new Date()
        }
      );

      return NextResponse.json({
        message: 'Selected notifications marked as read',
        modifiedCount: result.modifiedCount
      });
    }

    if (action === 'deleteMultiple' && notificationIds) {
      // Delete specific notifications
      const result = await Notification.deleteMany({
        _id: { $in: notificationIds },
        recipientEmail: session.user.email
      });

      return NextResponse.json({
        message: 'Selected notifications deleted',
        deletedCount: result.deletedCount
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in bulk notification update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
