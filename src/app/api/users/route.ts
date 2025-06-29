import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'author' } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      roles: [role],
      currentActiveRole: role,
      isFounder: false,
    });

    // Remove password from response
    const userResponse = user.toJSON();

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This GET function has been replaced by the one below that handles both single user and user list queries

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, affiliation, country, bio, expertise, orcid, profileImage } = await request.json();

    await dbConnect();
    
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        name,
        affiliation,
        country,
        bio,
        expertise,
        orcid,
        profileImage,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/users - Get users (with optional role filter) or current user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const listUsers = searchParams.get('list');

    // If requesting user list (for editors/admins)
    if (listUsers === 'true' || role) {
      if (!(session.user.roles?.includes('editor') || session.user.roles?.includes('admin'))) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      let query: any = {};
      if (role) {
        // Search for users that have the role in either the old 'role' field or the new 'roles' array
        query = {
          $or: [
            { role: role },
            { roles: { $in: [role] } }
          ]
        };
      }

      const users = await User.find(query)
        .select('name email role roles specializations createdAt')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ users });
    }

    // Otherwise, return current user profile
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
