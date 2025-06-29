import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find users who have a role but no roles array or empty roles array
    const usersToUpdate = await User.find({
      $or: [
        { roles: { $exists: false } },  // roles field doesn't exist
        { roles: { $size: 0 } },        // roles array is empty
        { roles: null }                 // roles is null
      ]
    });

    console.log(`Found ${usersToUpdate.length} users to update`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      if (user.role) {
        await User.findByIdAndUpdate(user._id, {
          roles: [user.role],
          currentActiveRole: user.role
        });
        updatedCount++;
        console.log(`Updated user ${user.name} (${user.email}): added role "${user.role}" to roles array`);
      }
    }

    return NextResponse.json({ 
      message: `Migration completed. Updated ${updatedCount} users.`,
      updatedUsers: updatedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
