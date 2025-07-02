import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const volume = await Volume.findById(params.id);
    
    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ volume });

  } catch (error) {
    console.error('Error fetching volume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    
    const volume = await Volume.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        lastModifiedBy: session.user.id,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Volume updated successfully',
      volume
    });

  } catch (error) {
    console.error('Error updating volume:', error);
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
    
    if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const volume = await Volume.findByIdAndDelete(params.id);

    if (!volume) {
      return NextResponse.json(
        { error: 'Volume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Volume deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting volume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
