import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import IndexingPartner from '@/models/IndexingPartner';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Validate website URL
    try {
      new URL(website);
    } catch {
      return NextResponse.json(
        { error: 'Invalid website URL' },
        { status: 400 }
      );
    }

    await dbConnect();

    const partner = await IndexingPartner.findById(params.id);
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    let logoData = partner.logo;
    if (logoFile) {
      // Delete old logo if it exists
      if (partner.logo?.publicId) {
        await deleteFromStorage(partner.logo.publicId);
      }

      // Upload new logo
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const uploadResult = await uploadToStorage(
        buffer,
        logoFile.name,
        'partners'
      );

      logoData = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: logoFile.name
      };
    }

    const updatedPartner = await IndexingPartner.findByIdAndUpdate(
      params.id,
      {
        name: name.trim(),
        description: description?.trim() || '',
        website: website.trim(),
        logo: logoData,
        order: order || 0,
        lastModifiedBy: session.user.id
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Partner updated successfully',
      partner: updatedPartner
    });

  } catch (error) {
    console.error('Error updating partner:', error);
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

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    await dbConnect();

    const partner = await IndexingPartner.findById(params.id);
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Delete logo from Cloudinary if it exists
    if (partner.logo?.publicId) {
      await deleteFromStorage(partner.logo.publicId);
    }

    await IndexingPartner.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: 'Partner deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
