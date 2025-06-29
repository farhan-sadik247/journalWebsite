import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import RoleApplication from '@/models/RoleApplication';
import User from '@/models/User';
import { notifyRoleApplicationSubmitted, notifyRoleApplicationDecision } from '@/lib/notificationUtils';

// POST /api/role-applications - Submit a role application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { requestedRole, motivation, qualifications, experience } = await request.json();

    // Validation
    if (!requestedRole || !['editor', 'admin'].includes(requestedRole)) {
      return NextResponse.json({ error: 'Invalid requested role' }, { status: 400 });
    }

    if (!motivation || !qualifications || !experience) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check role progression rules
    const currentRoles = user.roles || ['author'];
    
    if (requestedRole === 'editor') {
      // Authors can apply to become editors
      if (!currentRoles.includes('author') && currentRoles.length === 0) {
        return NextResponse.json({ error: 'Only authors can apply to become editors' }, { status: 400 });
      }
      if (currentRoles.includes('editor')) {
        return NextResponse.json({ error: 'You are already an editor' }, { status: 400 });
      }
    }

    if (requestedRole === 'admin') {
      // Only editors can apply to become admins
      if (!currentRoles.includes('editor')) {
        return NextResponse.json({ error: 'You must be an editor to apply for admin role' }, { status: 400 });
      }
      if (currentRoles.includes('admin')) {
        return NextResponse.json({ error: 'You are already an admin' }, { status: 400 });
      }
    }

    // Check for existing pending application
    const existingApplication = await RoleApplication.findOne({
      userId: user._id,
      requestedRole,
      status: 'pending'
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You already have a pending application for this role' }, { status: 400 });
    }

    // Create new application
    const application = new RoleApplication({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      currentRole: user.role || 'author',
      requestedRole,
      motivation,
      qualifications,
      experience
    });

    await application.save();

    // Notify all admins about the new application
    await notifyRoleApplicationSubmitted(
      user.name,
      user.email,
      requestedRole
    );

    return NextResponse.json({
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        requestedRole: application.requestedRole,
        status: application.status,
        submittedAt: application.submittedAt
      }
    });
  } catch (error) {
    console.error('Error submitting role application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/role-applications - Get role applications (admin only or user's own)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = user.roles?.includes('admin');
    
    let filter: any = {};
    
    if (isAdmin) {
      // Admin can see all applications
      const status = searchParams.get('status');
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filter.status = status;
      }
    } else {
      // Users can only see their own applications
      filter.userId = user._id;
    }

    const applications = await RoleApplication.find(filter)
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching role applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/role-applications - Review application (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || !adminUser.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { applicationId, status, comments } = await request.json();

    if (!applicationId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const application = await RoleApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application has already been reviewed' }, { status: 400 });
    }

    // Update application
    application.status = status;
    application.reviewedAt = new Date();
    application.reviewedBy = adminUser._id;
    application.reviewerComments = comments || '';
    await application.save();

    // If approved, update user role
    if (status === 'approved') {
      const targetUser = await User.findById(application.userId);
      if (targetUser) {
        const currentRoles = targetUser.roles || ['author'];
        
        if (!currentRoles.includes(application.requestedRole)) {
          currentRoles.push(application.requestedRole);
          targetUser.roles = currentRoles;
          
          // If becoming admin, also update primary role
          if (application.requestedRole === 'admin') {
            targetUser.role = 'admin';
            targetUser.currentActiveRole = 'admin';
          } else if (application.requestedRole === 'editor') {
            targetUser.currentActiveRole = 'editor';
          }
          
          await targetUser.save();
        }
      }
    }

    // Notify the applicant
    await notifyRoleApplicationDecision(
      application.userEmail,
      application.requestedRole,
      status,
      comments
    );

    return NextResponse.json({
      message: `Application ${status} successfully`,
      application
    });
  } catch (error) {
    console.error('Error reviewing role application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
