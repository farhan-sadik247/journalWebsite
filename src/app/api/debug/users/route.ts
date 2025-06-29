import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all users with their roles
    const users = await User.find({})
      .select('name email role roles currentActiveRole')
      .lean();
    
    // Count users by role
    const roleStats = {
      totalUsers: users.length,
      byRole: {} as Record<string, number>,
      byRolesArray: {} as Record<string, number>
    };
    
    users.forEach(user => {
      // Count by single role field
      if (user.role) {
        roleStats.byRole[user.role] = (roleStats.byRole[user.role] || 0) + 1;
      }
      
      // Count by roles array
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach(role => {
          roleStats.byRolesArray[role] = (roleStats.byRolesArray[role] || 0) + 1;
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      stats: roleStats,
      allUsers: users
    });
  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
