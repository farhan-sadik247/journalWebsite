import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import IndexingPartner from '@/models/IndexingPartner';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export async function GET() {
  try {
    await dbConnect();

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

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const website = formData.get('website') as string;
    const order = parseInt(formData.get('order') as string) || 0;
    const logoFile = formData.get('logo') as File;

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

    if (!logoFile) {
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

    // Upload logo to Cloudinary
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const uploadResult = await uploadToStorage(
      buffer,
      logoFile.name,
      'partners'
    );

    await dbConnect();

    const partner = await IndexingPartner.create({
      name: name.trim(),
      description: description?.trim() || '',
      website: website.trim(),
      logo: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: logoFile.name
      },
      order: order || 0,
      createdBy: session.user.id
    });

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
