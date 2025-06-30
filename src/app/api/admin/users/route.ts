import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectMongoDB from '@/lib/mongodb';
import User from '@/models/User';

// GET - Fetch all users (Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    await connectMongoDB();
    
    const users = await User.find({})
      .select('name email roles currentActiveRole isFounder affiliation profileImage designation designationRole createdAt role')
      .sort({ createdAt: -1 });
      
    // Ensure every user has roles populated
    const processedUsers = users.map(user => {
      const userData = user.toObject ? user.toObject() : user;
      
      // Make sure roles is an array
      if (!userData.roles || !Array.isArray(userData.roles) || userData.roles.length === 0) {
        userData.roles = userData.role ? [userData.role] : ['author'];
      }
      
      // Make sure currentActiveRole is set
      if (!userData.currentActiveRole) {
        userData.currentActiveRole = userData.role || userData.roles[0] || 'author';
      }
      
      return userData;
    });

    return NextResponse.json({ users: processedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH - Update user roles/designation (Admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action, role, designation, designationRole } = body;

    // Handle designation or designation role update
    if (userId && (designation !== undefined || designationRole !== undefined)) {
      await connectMongoDB();
      
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Only allow designation updates for editors and reviewers
      console.log('Checking user roles for designation update:', {
        userId: targetUser._id,
        email: targetUser.email,
        roles: targetUser.roles,
        hasEditor: targetUser.roles.includes('editor'),
        hasReviewer: targetUser.roles.includes('reviewer')
      });
      
      if (!targetUser.roles.includes('editor') && !targetUser.roles.includes('reviewer')) {
        return NextResponse.json(
          { error: 'Designation can only be set for editors and reviewers' },
          { status: 400 }
        );
      }
      
      console.log('User is eligible for designation update. Updating:', {
        designation,
        designationRole
      });
      
      // Update designation if provided
      if (designation !== undefined) {
        targetUser.designation = designation;
        
        // When changing designation, reset the role
        if (designation === '') {
          targetUser.designationRole = '';
        } else if (designationRole === undefined) {
          // Only reset designationRole if it's not being explicitly set
          targetUser.designationRole = '';
        }
      }
      
      // Update designation role if provided
      if (designationRole !== undefined) {
        targetUser.designationRole = designationRole;
      }
      
      await targetUser.save();
      
      return NextResponse.json({
        success: true,
        message: designation !== undefined ? 
          'User designation updated successfully' :
          'User designation role updated successfully',
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          roles: targetUser.roles,
          currentActiveRole: targetUser.currentActiveRole,
          designation: targetUser.designation,
          designationRole: targetUser.designationRole
        }
      });
    }
    
    // Handle role update
    if (!userId || !action || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action, role' },
        { status: 400 }
      );
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }

    if (!['author', 'reviewer', 'editor', 'copy-editor', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    await connectMongoDB();
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent non-founders from modifying founder's admin role
    if (targetUser.isFounder && role === 'admin' && action === 'remove' && session.user.email !== targetUser.email) {
      return NextResponse.json(
        { error: 'Cannot remove admin role from founder' },
        { status: 403 }
      );
    }

    // Prevent non-founders from modifying founder unless it's the founder themselves
    if (targetUser.isFounder && session.user.email !== targetUser.email && !session.user.isFounder) {
      return NextResponse.json(
        { error: 'Cannot modify founder account' },
        { status: 403 }
      );
    }

    if (action === 'add') {
      if (!targetUser.roles.includes(role)) {
        targetUser.roles.push(role);
      }
    } else if (action === 'remove') {
      // Ensure user always has at least the 'author' role
      if (role === 'author' && targetUser.roles.length === 1) {
        return NextResponse.json(
          { error: 'User must have at least one role' },
          { status: 400 }
        );
      }
      
      targetUser.roles = targetUser.roles.filter((r: string) => r !== role);
      
      // If removing current active role, set to first available role
      if (targetUser.currentActiveRole === role) {
        targetUser.currentActiveRole = targetUser.roles[0] || 'author';
      }
    }

    // Ensure author role is always present if no other roles
    if (targetUser.roles.length === 0) {
      targetUser.roles = ['author'];
      targetUser.currentActiveRole = 'author';
    }

    await targetUser.save();

    return NextResponse.json({ 
      message: `Role ${action}ed successfully`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        roles: targetUser.roles,
        currentActiveRole: targetUser.currentActiveRole
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    await connectMongoDB();
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of founder
    if (targetUser.isFounder) {
      return NextResponse.json(
        { error: 'Cannot delete founder account' },
        { status: 403 }
      );
    }

    // Prevent users from deleting themselves (except founder can delete their own account)
    if (session.user.email === targetUser.email && !session.user.isFounder) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    await User.findByIdAndDelete(userId);

    return NextResponse.json({ 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
