import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Correction from '@/models/Correction';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has editor or admin role
    const userRole = session.user.role;
    const userRoles = session.user.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Get the correction
    const correction = await Correction.findById(params.id);
    if (!correction) {
      return NextResponse.json(
        { error: 'Correction not found' },
        { status: 404 }
      );
    }

    // Update correction status and publish date
    correction.status = 'published';
    correction.publishedDate = new Date();
    correction.isPublic = true;

    // Add timeline event
    correction.timeline.push({
      event: 'published',
      description: 'Correction published',
      performedBy: session.user.id,
      date: new Date()
    });

    await correction.save();

    return NextResponse.json({
      success: true,
      message: 'Correction published successfully',
      data: {
        correction
      }
    });

  } catch (error) {
    console.error('Error publishing correction:', error);
    return NextResponse.json(
      { error: 'Failed to publish correction' },
      { status: 500 }
    );
  }
}
