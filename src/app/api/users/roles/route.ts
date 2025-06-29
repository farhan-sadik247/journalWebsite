import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { notifyAdminAction } from '@/lib/notificationUtils';

// PUT /api/users/roles - Update user roles (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, role, roles, action } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let updatedUser;
    let notificationMessage = '';

    switch (action) {
      case 'setPrimaryRole':
        if (!role) {
          return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { role, currentActiveRole: role },
          { new: true }
        );
        
        notificationMessage = `Your primary role has been updated to: ${role}`;
        break;

      case 'addRole':
        if (!role) {
          return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        
        const currentRoles = targetUser.roles || [];
        if (!currentRoles.includes(role)) {
          currentRoles.push(role);
        }
        
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { roles: currentRoles },
          { new: true }
        );
        
        notificationMessage = `You have been granted the ${role} role`;
        break;

      case 'removeRole':
        if (!role) {
          return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        
        const filteredRoles = (targetUser.roles || []).filter((r: string) => r !== role);
        
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { roles: filteredRoles },
          { new: true }
        );
        
        notificationMessage = `Your ${role} role has been removed`;
        break;

      case 'setMultipleRoles':
        if (!roles || !Array.isArray(roles)) {
          return NextResponse.json({ error: 'Roles array is required' }, { status: 400 });
        }
        
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { roles: roles },
          { new: true }
        );
        
        notificationMessage = `Your roles have been updated to: ${roles.join(', ')}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Send notification to the user about role change
    if (updatedUser && notificationMessage) {
      await notifyAdminAction(
        updatedUser.email,
        'Role Assignment Update',
        notificationMessage,
        '/dashboard'
      );
    }

    return NextResponse.json({
      message: 'User roles updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        roles: updatedUser.roles,
        currentActiveRole: updatedUser.currentActiveRole
      }
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/users/roles - Get all users with their roles (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

    const filter: any = {};
    
    if (roleFilter && roleFilter !== 'all') {
      filter.$or = [
        { role: roleFilter },
        { roles: { $in: [roleFilter] } }
      ];
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { affiliation: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('name email role roles currentActiveRole affiliation isFounder createdAt')
      .sort({ name: 1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users with roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
