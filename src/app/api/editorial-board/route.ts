import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Designation from '@/models/Designation';
import mongoose from 'mongoose';

// Define types for better type safety
interface EditorProfile {
  _id: string;
  name: string;
  email: string;
  affiliation: string;
  bio: string;
  specializations: string[];
  orcid?: string;
  profileImage?: string;
  joinedDate: string;
  isFounder: boolean;
  roles: string[];
  currentRole: string;
  designation: string;
  designationRole: string;
}

interface DesignationDetails {
  _id: string;
  name: string;
  roles: { _id: string, name: string }[];
  editors: EditorProfile[];
}

interface GroupedEditors {
  noDesignation: EditorProfile[];
  byDesignation: { [key: string]: DesignationDetails };
}

export async function GET() {
  try {
    await dbConnect();

    // Fetch all designations with their roles
    const designations = await Designation.find().lean();
    const designationsMap: { [key: string]: any } = designations.reduce((acc: any, designation: any) => {
      acc[designation.name] = {
        ...designation,
        editors: []
      };
      return acc;
    }, {});

    // Fetch users with editor role or admin role (if they have editor in their roles array)
    const editors = await User.find({
      $or: [
        { role: 'editor' },
        { role: 'admin', roles: 'editor' },
        { roles: 'editor' }
      ]
    })
      .select('name email affiliation bio expertise orcid profileImage createdAt role roles isFounder designation designationRole')
      .sort({ isFounder: -1, createdAt: 1 }) // Founder first, then by creation date
      .lean();

    // Transform the data to match the expected format
    const editorialBoard = editors.map((editor: any) => ({
      _id: editor._id,
      name: editor.name,
      email: editor.email,
      affiliation: editor.affiliation || 'Not specified',
      bio: editor.bio || 'No biography available.',
      specializations: editor.expertise || [],
      orcid: editor.orcid,
      profileImage: editor.profileImage,
      joinedDate: editor.createdAt,
      isFounder: editor.isFounder || false,
      roles: editor.roles || [editor.role],
      currentRole: editor.role,
      designation: editor.designation || '',
      designationRole: editor.designationRole || '',
    })) as EditorProfile[];

    // Group editors by designation
    const groupedEditors: GroupedEditors = {
      noDesignation: [],
      byDesignation: {}
    };

    // Populate editors into their designation groups
    for (const editor of editorialBoard) {
      if (!editor.designation) {
        // Push to no designation group
        groupedEditors.noDesignation.push(editor);
      } else {
        // Create designation group if it doesn't exist
        if (!groupedEditors.byDesignation[editor.designation]) {
          // Find the designation details
          const designationDetails = designationsMap[editor.designation] || { name: editor.designation, roles: [] };
          groupedEditors.byDesignation[editor.designation] = {
            _id: designationDetails._id || '',
            name: editor.designation,
            roles: designationDetails.roles || [],
            editors: []
          };
        }

        // Add editor to their designation group
        groupedEditors.byDesignation[editor.designation].editors.push(editor);
      }
    }

    return NextResponse.json({
      success: true,
      editors: editorialBoard,
      groupedEditors: groupedEditors,
      designations: designations,
      count: editorialBoard.length,
    });
  } catch (error) {
    console.error('Error fetching editorial board:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch editorial board members',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
