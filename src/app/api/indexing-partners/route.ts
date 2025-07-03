import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import IndexingPartner from '@/models/IndexingPartner';

export async function GET() {
  try {
    await connectToDatabase();

    const partners = await IndexingPartner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('name description website logo order');

    return NextResponse.json({
      partners
    });

  } catch (error) {
    console.error('Error fetching indexing partners:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { name, description, website, logo, order } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Partner name is required' },
        { status: 400 }
      );
    }

    if (!website?.trim()) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    if (!logo?.url || !logo?.publicId) {
      return NextResponse.json(
        { error: 'Logo image is required' },
        { status: 400 }
      );
    }

    // Validate website URL
    try {
      new URL(website);
    } catch {
      return NextResponse.json(
        { error: 'Invalid website URL' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const partner = new IndexingPartner({
      name: name.trim(),
      description: description?.trim() || '',
      website: website.trim(),
      logo,
      order: order || 0,
      createdBy: session.user.id
    });

    await partner.save();

    return NextResponse.json({
      message: 'Indexing partner created successfully',
      partner
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating indexing partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
