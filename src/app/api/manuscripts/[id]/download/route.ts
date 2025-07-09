import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== Download endpoint called ===');
  console.log('Manuscript ID:', params.id);

  try {
    // Get user session
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'exists' : 'does not exist');
    if (session?.user) {
      console.log('User ID:', session.user.id);
      console.log('User role:', session.user.role);
    }

    // Connect to database
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    // Find manuscript
    const filter = { _id: params.id };
    console.log('Query filter:', filter);
    const manuscript = await Manuscript.findOne(filter);
    
    if (!manuscript) {
      console.log('Manuscript not found');
      return new NextResponse('Manuscript not found', { status: 404 });
    }

    console.log('Manuscript found:', {
      title: manuscript.title,
      status: manuscript.status,
      filesCount: manuscript.files?.length || 0,
      latestFilesCount: manuscript.latestFiles?.length || 0,
      galleyProofsCount: manuscript.galleyProofs?.length || 0
    });

    // Check authentication first
    if (!session) {
      console.log('Access denied: User not authenticated');
      return new NextResponse('Please sign in to download articles', { status: 401 });
    }

    // Check access
    const isPublished = manuscript.status === 'published';
    const isAdmin = session.user.role === 'admin';
    const isAuthor = manuscript.submittedBy.toString() === session.user.id;
    
    // Allow access if:
    // 1. Manuscript is published, or
    // 2. User is admin, or
    // 3. User is the author
    if (!isPublished && !isAdmin && !isAuthor) {
      console.log('Access denied: Manuscript not published and user has no special access');
      return new NextResponse('Unauthorized: You do not have access to this manuscript', { status: 403 });
    }

    console.log('Access granted:', 
      isPublished ? 'Published manuscript' : 'Unpublished manuscript',
      isAdmin ? ', user is admin' : '',
      isAuthor ? ', user is author' : ''
    );

    // Get latest file from either latestFiles or files array
    let fileToDownload = manuscript.latestFiles?.[0] || manuscript.files?.[0];
    if (!fileToDownload) {
      console.log('No file found in either latestFiles or files array');
      return new NextResponse('No file found', { status: 404 });
    }

    console.log('Selected file for download:', {
      originalName: fileToDownload.originalName,
      type: fileToDownload.type,
      cloudinaryId: fileToDownload.cloudinaryId,
      url: fileToDownload.url
    });

    // Extract file details
    const originalUrl = fileToDownload.url;
    const cloudinaryId = fileToDownload.cloudinaryId;
    const extension = fileToDownload.originalName.split('.').pop()?.toLowerCase() || '';

    console.log('File details:', {
      originalUrl,
      cloudinaryId,
      extension
    });

    try {
      // If we have a cloudinaryId, use it directly
      if (cloudinaryId) {
        console.log('Using cloudinaryId:', cloudinaryId);
        
        const downloadUrl = cloudinary.utils.private_download_url(cloudinaryId, extension, {
          resource_type: 'image', // Use image type since files are uploaded as images
          type: 'upload',
          attachment: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        });

        if (!downloadUrl) {
          throw new Error('Failed to generate signed URL');
        }

        console.log('Generated signed URL:', downloadUrl);
        console.log('Attempting to fetch file from URL:', downloadUrl);

        // Fetch the file
        const response = await fetch(downloadUrl);
        console.log('Fetch response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          console.log('Fetch error:', {
            status: response.status,
            statusText: response.statusText,
            url: downloadUrl
          });
          
          // Try fallback to original URL if fetch fails
          console.log('Falling back to original URL:', originalUrl);
          return NextResponse.redirect(originalUrl);
        }

        // Stream the file
        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${fileToDownload.originalName}"`);
        
        return new NextResponse(blob, { headers });
      } else {
        // If no cloudinaryId, redirect to the original URL
        console.log('No cloudinaryId found, redirecting to original URL:', originalUrl);
        return NextResponse.redirect(originalUrl);
      }
    } catch (error) {
      console.error('Error generating or fetching signed URL:', error);
      // Fallback to original URL
      console.log('Falling back to original URL due to error:', originalUrl);
      return NextResponse.redirect(originalUrl);
    }
  } catch (error) {
    console.error('Error in download endpoint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
