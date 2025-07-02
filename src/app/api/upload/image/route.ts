import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'profile'; // 'profile' or 'cover'
    const folder = formData.get('folder') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine upload folder and filename based on type
    let uploadFolder = folder || 'profile-images';
    let fileName = `profile_${session.user.id}_${Date.now()}`;
    
    if (type === 'cover') {
      uploadFolder = folder || 'journal/covers';
      fileName = `cover_${Date.now()}`;
      
      // Check permissions for cover uploads
      if (!['editor', 'admin'].includes(session.user.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions for cover image upload' 
        }, { status: 403 });
      }
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      buffer, 
      `${fileName}.${file.name.split('.').pop()}`,
      uploadFolder
    );

    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.name,
        format: result.format,
        bytes: result.bytes,
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
