import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== Download endpoint called ===');
  console.log('Manuscript ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'exists' : 'null');
    console.log('User ID:', session?.user?.id);
    console.log('User role:', session?.user?.role);
    
    if (!session) {
      console.log('ERROR: No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      console.log('ERROR: Invalid manuscript ID:', params.id);
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    // Build filter based on user role and manuscript status
    const filter: any = { _id: new mongoose.Types.ObjectId(params.id) };
    
    console.log('Query filter:', filter);
    const manuscript = await Manuscript.findOne(filter).lean() as any;
    
    if (manuscript) {
      // Check access permissions based on manuscript status and user role
      let hasAccess = false;
      
      if (manuscript.status === 'published') {
        // Published manuscripts can be downloaded by any authenticated user
        hasAccess = true;
        console.log('Access granted: Published manuscript, user is authenticated');
      } else if (['editor', 'admin'].includes(session.user.role)) {
        // Editors and admins can download all manuscripts regardless of status
        hasAccess = true;
        console.log('Access granted: User is editor/admin');
      } else if (session.user.role === 'author' && manuscript.submittedBy?.toString() === session.user.id) {
        // Authors can only download their own manuscripts (if not published)
        hasAccess = true;
        console.log('Access granted: Author downloading own manuscript');
      }
      
      if (!hasAccess) {
        console.log('ERROR: Access denied. Status:', manuscript.status, 'Role:', session.user.role);
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    console.log('Manuscript found:', manuscript ? 'yes' : 'no');
    
    if (manuscript) {
      console.log('Manuscript title:', manuscript.title);
      console.log('Files count:', manuscript.files?.length || 0);
      console.log('First file info:', manuscript.files?.[0] ? {
        originalName: manuscript.files[0].originalName,
        url: manuscript.files[0].url ? 'exists' : 'missing',
        type: manuscript.files[0].type
      } : 'no files');
    }

    if (!manuscript) {
      console.log('ERROR: Manuscript not found with filter:', filter);
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Select the appropriate file to download based on manuscript status and available files
    let fileToDownload = null;
    
    // Priority 1: Check for latestManuscriptFiles (most recent version)
    if (manuscript.latestManuscriptFiles?.length > 0) {
      fileToDownload = manuscript.latestManuscriptFiles[manuscript.latestManuscriptFiles.length - 1];
      console.log('Selected latest manuscript file');
    }
    // Priority 2: For published manuscripts, check galley proofs if no latest files
    else if (manuscript.status === 'published' && manuscript.productionPhase?.galleyProofs?.length > 0) {
      const finalPdf = manuscript.productionPhase.galleyProofs.find((file: any) => file.type === 'final-pdf');
      if (finalPdf) {
        fileToDownload = finalPdf;
        console.log('Selected final PDF from galley proofs');
      } else {
        // If no final-pdf, get the latest galley proof
        fileToDownload = manuscript.productionPhase.galleyProofs[manuscript.productionPhase.galleyProofs.length - 1];
        console.log('Selected latest galley proof');
      }
    }
    // Priority 3: Fall back to original files
    else {
      if (!manuscript.files || manuscript.files.length === 0) {
        console.log('ERROR: No files available for manuscript');
        return NextResponse.json(
          { error: 'No files available for download' },
          { status: 404 }
        );
      }
      
      // Use the main manuscript file or first available file
      const manuscriptFile = manuscript.files.find((file: any) => file.type === 'manuscript');
      fileToDownload = manuscriptFile || manuscript.files[0];
      console.log('Selected original manuscript file');
    }

    console.log('Attempting to download file:', {
      originalName: fileToDownload.originalName,
      url: fileToDownload.url ? 'exists' : 'missing',
      type: fileToDownload.type,
      size: fileToDownload.size,
      source: manuscript.latestManuscriptFiles?.includes(fileToDownload) ? 'latest manuscript files' : 
              manuscript.productionPhase?.galleyProofs?.includes(fileToDownload) ? 'galley proofs' : 'original files'
    });
    
    if (fileToDownload.url) {
      console.log('Downloading file:', fileToDownload.originalName);
      console.log('Cloudinary URL:', fileToDownload.url);
      
      try {
        // Fetch the file from Cloudinary
        const response = await fetch(fileToDownload.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const fileBuffer = await response.arrayBuffer();
        
        // Ensure the filename has the correct extension
        let filename = fileToDownload.originalName || 'manuscript.pdf';
        if (!filename.toLowerCase().endsWith('.pdf') && fileToDownload.originalName?.toLowerCase().includes('pdf')) {
          filename = filename + '.pdf';
        }
        
        // Create headers for file download
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Length', fileBuffer.byteLength.toString());
        
        console.log('Sending file with headers:', {
          filename,
          contentType: 'application/pdf',
          size: fileBuffer.byteLength
        });
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: headers,
        });
        
      } catch (fetchError) {
        console.error('Error fetching file from Cloudinary:', fetchError);
        return NextResponse.json(
          { error: 'Failed to download file from storage' },
          { status: 500 }
        );
      }
    } else {
      console.log('ERROR: File URL not available');
      return NextResponse.json(
        { error: 'File URL not available' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Download manuscript error:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
