import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ORCIDService } from '@/lib/orcid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orcidId } = body;

    if (!orcidId) {
      return NextResponse.json({ error: 'ORCID ID is required' }, { status: 400 });
    }

    // Validate ORCID format
    if (!ORCIDService.validateORCIDFormat(orcidId)) {
      return NextResponse.json({ error: 'Invalid ORCID ID format' }, { status: 400 });
    }

    // Fetch ORCID profile
    const profile = await ORCIDService.getORCIDProfile(orcidId);
    
    if (!profile) {
      return NextResponse.json({ error: 'ORCID profile not found' }, { status: 404 });
    }

    // Verify ownership (compare names)
    const isOwner = ORCIDService.verifyORCIDOwnership(
      session.user.name || '',
      profile,
      0.7 // Lower threshold for more flexibility
    );

    return NextResponse.json({
      profile,
      isOwner,
      verificationStatus: isOwner ? 'verified' : 'name-mismatch',
      orcidUrl: ORCIDService.getORCIDUrl(orcidId)
    });

  } catch (error) {
    console.error('Error verifying ORCID:', error);
    return NextResponse.json(
      { error: 'Failed to verify ORCID' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orcidId = searchParams.get('orcidId');

    if (!orcidId) {
      return NextResponse.json({ error: 'ORCID ID is required' }, { status: 400 });
    }

    // Validate ORCID format
    if (!ORCIDService.validateORCIDFormat(orcidId)) {
      return NextResponse.json({ error: 'Invalid ORCID ID format' }, { status: 400 });
    }

    // Fetch public ORCID profile
    const profile = await ORCIDService.getORCIDProfile(orcidId);
    
    if (!profile) {
      return NextResponse.json({ error: 'ORCID profile not found' }, { status: 404 });
    }

    // Return only public information
    return NextResponse.json({
      orcidId: profile.orcidId,
      name: profile.name,
      verified: profile.verified,
      affiliations: profile.affiliations,
      recentWorks: profile.works.slice(0, 5), // Only recent works
      orcidUrl: ORCIDService.getORCIDUrl(orcidId)
    });

  } catch (error) {
    console.error('Error fetching ORCID profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ORCID profile' },
      { status: 500 }
    );
  }
}
