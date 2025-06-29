import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Review from '@/models/Review';
import mongoose from 'mongoose';

// Define type for Manuscript document
interface ManuscriptDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  status: string;
  [key: string]: any;
}

// GET /api/debug/manuscript/[id] - Debug manuscript status
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid manuscript ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the raw manuscript
    const manuscript = await Manuscript.findById(params.id).lean() as any;
    
    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Get all reviews for this manuscript
    const allReviews = await Review.find({ manuscriptId: new mongoose.Types.ObjectId(params.id) }).lean();
    const completedReviews = allReviews.filter(review => review.status === 'completed');

    // Manual status calculation
    let calculatedStatus = manuscript.status as string;
    if (completedReviews.length >= 2) {
      const recommendations = completedReviews.map(r => r.recommendation);
      const acceptCount = recommendations.filter(r => r === 'accept').length;
      const rejectCount = recommendations.filter(r => r === 'reject').length;
      const majorRevisionCount = recommendations.filter(r => r === 'major-revision').length;
      const minorRevisionCount = recommendations.filter(r => r === 'minor-revision').length;

      if (acceptCount >= Math.ceil(completedReviews.length / 2)) {
        calculatedStatus = 'accepted';
      } else if (rejectCount >= Math.ceil(completedReviews.length / 2)) {
        calculatedStatus = 'rejected';
      } else if (majorRevisionCount > 0) {
        calculatedStatus = 'major-revision-requested';
      } else if (minorRevisionCount > 0) {
        calculatedStatus = 'minor-revision-requested';
      } else {
        calculatedStatus = 'under-editorial-review';
      }
    }

    return NextResponse.json({
      manuscriptId: params.id,
      title: manuscript.title,
      storedStatus: manuscript.status,
      calculatedStatus,
      totalReviews: allReviews.length,
      completedReviews: completedReviews.length,
      recommendations: completedReviews.map(r => ({
        reviewId: r._id,
        recommendation: r.recommendation,
        status: r.status,
        completedDate: r.completedDate
      })),
      shouldUpdateStatus: calculatedStatus !== manuscript.status && completedReviews.length >= 2
    });

  } catch (error) {
    console.error('Debug manuscript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
