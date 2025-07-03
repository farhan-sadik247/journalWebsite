import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import IndexingPartner from '@/models/IndexingPartner';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const partners = await IndexingPartner.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    return NextResponse.json({
      partners
    });

  } catch (error) {
    console.error('Error fetching indexing partners for admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
