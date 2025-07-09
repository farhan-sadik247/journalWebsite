import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import connectToDatabase from '@/lib/mongodb';
import Volume from '@/models/Volume';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    await connectToDatabase();

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);

    const skip = (page - 1) * limit;

    // Get volumes with manuscript count
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'manuscripts',
          localField: 'number',
          foreignField: 'volume',
          as: 'manuscripts'
        }
      },
      {
        $addFields: {
          manuscriptCount: { $size: '$manuscripts' },
          publishedManuscriptCount: {
            $size: {
              $filter: {
                input: '$manuscripts',
                cond: { $eq: ['$$this.status', 'published'] }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          manuscripts: 0,
          'createdBy.password': 0
        }
      },
      { $sort: { year: -1, number: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [volumes, total] = await Promise.all([
      Volume.aggregate(pipeline),
      Volume.countDocuments(filter)
    ]);

    return NextResponse.json({
      volumes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching volumes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has editor or admin role in either role or roles array
    const userRole = session.user.role;
    const userRoles = session.user.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { number, year, title, description, coverImage, status, editorNotes } = await request.json();

    if (!number || !year || !title) {
      return NextResponse.json({ error: 'Number, year, and title are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if volume with this number already exists
    const existingVolume = await Volume.findOne({ number });
    if (existingVolume) {
      return NextResponse.json({ error: 'Volume with this number already exists' }, { status: 400 });
    }

    const volume = new Volume({
      number,
      year,
      title,
      description: description || '',
      coverImage: coverImage || '',
      status: status || 'draft',
      editorNotes: editorNotes || '',
      createdBy: session.user.id,
      lastModifiedBy: session.user.id,
    });

    await volume.save();

    const populatedVolume = await Volume.findById(volume._id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    return NextResponse.json({
      message: 'Volume created successfully',
      volume: populatedVolume
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating volume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
