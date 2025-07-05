import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/admin/init-founder - Initialize the founder admin (one-time setup)
export async function POST() {
  try {
    await dbConnect();

    // Check if founder already exists
    const founderExists = await User.findOne({ isFounder: true });
    if (founderExists) {
      // Always update founder to have all roles
      founderExists.role = 'admin';
      founderExists.roles = ['admin', 'editor', 'reviewer', 'author'];
      founderExists.currentActiveRole = 'admin';
      founderExists.isFounder = true;
      if (!founderExists.affiliation) founderExists.affiliation = 'BRAC University';
      if (!founderExists.bio) founderExists.bio = 'Founder and Editor-in-Chief of the journal. Leading expert in academic publishing and research excellence.';
      await founderExists.save();
      
      return NextResponse.json({
        message: 'Founder roles updated successfully',
        founder: {
          name: founderExists.name,
          email: founderExists.email,
          roles: founderExists.roles,
          currentActiveRole: founderExists.currentActiveRole,
          isFounder: founderExists.isFounder
        }
      }, { status: 200 });
    }

    // Check if admin user exists - support multiple founder emails
    const founderEmails = ['seed.swim@gmail.com', 'fsadik2319@gmail.com'];
    let founder = await User.findOne({ 
      email: { $in: founderEmails }
    });

    if (!founder) {
      // Create founder accounts for both emails if neither exists
      const foundersCreated = [];
      
      for (const email of founderEmails) {
        const existingUser = await User.findOne({ email });
        
        if (!existingUser) {
          const founderName = email === 'seed.swim@gmail.com' ? 'Admin User' : 'Farhan Sadik';
          const newFounder = await User.create({
            name: founderName,
            email: email,
            googleId: `admin-oauth-${email.replace('@', '-').replace('.', '-')}`, // This allows password to be optional
            role: 'admin',
            roles: ['admin', 'editor', 'reviewer', 'author'],
            currentActiveRole: 'admin',
            isFounder: true,
            affiliation: 'Journal Administrator',
            bio: 'System Administrator and Editor-in-Chief of the journal.',
            isEmailVerified: true,
          });
          foundersCreated.push(newFounder);
        }
      }
      
      founder = foundersCreated[0] || await User.findOne({ email: { $in: founderEmails } });
    } else {
      // Update existing user to be founder with all roles
      founder.role = 'admin';
      founder.roles = ['admin', 'editor', 'reviewer', 'author'];
      founder.currentActiveRole = 'admin';
      founder.isFounder = true;
      if (!founder.affiliation) founder.affiliation = 'Journal Administrator';
      if (!founder.bio) founder.bio = 'System Administrator and Editor-in-Chief of the journal.';
      await founder.save();
      
      // Also ensure the other email is set up as founder if it exists
      const otherEmail = founderEmails.find(email => email !== founder.email);
      if (otherEmail) {
        const otherUser = await User.findOne({ email: otherEmail });
        if (otherUser && !otherUser.isFounder) {
          otherUser.role = 'admin';
          otherUser.roles = ['admin', 'editor', 'reviewer', 'author'];
          otherUser.currentActiveRole = 'admin';
          otherUser.isFounder = true;
          if (!otherUser.affiliation) otherUser.affiliation = 'Journal Administrator';
          if (!otherUser.bio) otherUser.bio = 'System Administrator and Editor-in-Chief of the journal.';
          await otherUser.save();
        }
      }
    }

    return NextResponse.json({
      message: 'Founder initialized successfully',
      founder: {
        name: founder.name,
        email: founder.email,
        roles: founder.roles,
        isFounder: founder.isFounder
      }
    });

  } catch (error) {
    console.error('Error initializing founder:', error);
    return NextResponse.json(
      { error: 'Failed to initialize founder' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/switch-role - Switch between admin and editor roles
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetRole } = await request.json();

    if (!['admin', 'editor', 'reviewer', 'copy-editor', 'author'].includes(targetRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to switch to this role
    if (!user.roles || !user.roles.includes(targetRole)) {
      return NextResponse.json({ 
        error: 'You do not have permission to switch to this role' 
      }, { status: 403 });
    }

    // Update current active role
    user.currentActiveRole = targetRole;
    user.role = targetRole; // Also update main role for compatibility
    await user.save();

    return NextResponse.json({
      message: 'Role switched successfully',
      currentRole: targetRole,
      availableRoles: user.roles
    });

  } catch (error) {
    console.error('Error switching role:', error);
    return NextResponse.json(
      { error: 'Failed to switch role' },
      { status: 500 }
    );
  }
}

// GET /api/admin/founder-info - Get founder information
export async function GET() {
  try {
    await dbConnect();

    const founder = await User.findOne({ isFounder: true })
      .select('name email roles currentActiveRole isFounder affiliation bio')
      .lean();

    if (!founder) {
      return NextResponse.json({
        message: 'Founder not yet initialized',
        requiresInit: true
      });
    }

    return NextResponse.json({
      founder: {
        name: (founder as any).name,
        email: (founder as any).email,
        roles: (founder as any).roles,
        currentActiveRole: (founder as any).currentActiveRole,
        isFounder: (founder as any).isFounder,
        affiliation: (founder as any).affiliation,
        bio: (founder as any).bio
      }
    });

  } catch (error) {
    console.error('Error fetching founder info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch founder info' },
      { status: 500 }
    );
  }
}
