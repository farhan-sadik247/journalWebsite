import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has analytics permissions
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '12m';

    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '12m':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    // Generate CSV content
    const manuscripts = await Manuscript.find({
      submissionDate: { $gte: startDate }
    })
      .select('title category status submissionDate publishedDate metrics')
      .populate('submittedBy', 'name email')
      .lean();

    const csvHeader = [
      'Title',
      'Category', 
      'Status',
      'Submission Date',
      'Published Date',
      'Views',
      'Downloads',
      'Citations',
      'Submitted By',
      'Author Email'
    ].join(',');

    const csvRows = manuscripts.map(manuscript => [
      `"${manuscript.title.replace(/"/g, '""')}"`,
      manuscript.category,
      manuscript.status,
      manuscript.submissionDate.toISOString().split('T')[0],
      manuscript.publishedDate ? manuscript.publishedDate.toISOString().split('T')[0] : '',
      manuscript.metrics?.views || 0,
      manuscript.metrics?.downloads || 0,
      manuscript.metrics?.citations || 0,
      `"${(manuscript.submittedBy as any)?.name || ''}"`,
      (manuscript.submittedBy as any)?.email || ''
    ].join(',')).join('\n');

    const csvContent = [csvHeader, csvRows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="journal-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
