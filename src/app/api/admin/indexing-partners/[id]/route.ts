import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import IndexingPartner from '@/models/IndexingPartner';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { name, description, website, logo, order, isActive } = await request.json();

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

    const partner = await IndexingPartner.findById(params.id);
    if (!partner) {
      return NextResponse.json(
        { error: 'Indexing partner not found' },
        { status: 404 }
      );
    }

    // Update partner data
    partner.name = name.trim();
    partner.description = description?.trim() || '';
    partner.website = website.trim();
    partner.order = order || 0;
    partner.isActive = isActive;
    partner.updatedBy = session.user.id;

    // Update logo if provided
    if (logo && logo.url && logo.publicId) {
      partner.logo = logo;
    }

    await partner.save();

    return NextResponse.json({
      message: 'Indexing partner updated successfully',
      partner
    });

  } catch (error) {
    console.error('Error updating indexing partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const partner = await IndexingPartner.findById(params.id);
    if (!partner) {
      return NextResponse.json(
        { error: 'Indexing partner not found' },
        { status: 404 }
      );
    }

    // Delete logo from Cloudinary if it exists
    if (partner.logo?.publicId) {
      try {
        await cloudinary.uploader.destroy(partner.logo.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await IndexingPartner.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: 'Indexing partner deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting indexing partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
