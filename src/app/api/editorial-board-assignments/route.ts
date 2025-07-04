import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all users who have been assigned to editorial board positions
    const assignments = await User.find({
      $and: [
        { designation: { $exists: true, $ne: '' } },
        { designationRole: { $exists: true, $ne: '' } }
      ]
    })
    .select('name email affiliation bio expertise orcid profileImage designation designationRole')
    .lean();

    const formattedAssignments = assignments.map(user => ({
      _id: user._id,
      userId: user._id,
      designation: user.designation,
      role: user.designationRole,
      description: '', // We can add this field to User model if needed
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        affiliation: user.affiliation,
        bio: user.bio,
        expertise: user.expertise || [],
        orcid: user.orcid,
        profileImage: user.profileImage
      }
    }));

    return NextResponse.json({
      success: true,
      assignments: formattedAssignments
    });
  } catch (error) {
    console.error('Error fetching editorial board assignments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch editorial board assignments'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { userId, designation, role, description } = await request.json();
    
    if (!userId || !designation || !role) {
      return NextResponse.json(
        { success: false, error: 'User ID, designation, and role are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user with designation and role
    user.designation = designation;
    user.designationRole = role;
    
    // Add editor role if not already present
    if (!user.roles.includes('editor')) {
      user.roles.push('editor');
    }

    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Editor assigned to editorial board successfully',
      assignment: {
        _id: user._id,
        userId: user._id,
        designation,
        role,
        description,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          affiliation: user.affiliation,
          bio: user.bio,
          expertise: user.expertise || [],
          orcid: user.orcid,
          profileImage: user.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Error assigning editor to editorial board:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign editor to editorial board'
      },
      { status: 500 }
    );
  }
}
