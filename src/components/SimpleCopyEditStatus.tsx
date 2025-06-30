'use client';

import React from 'react';
import Link from 'next/link';
import { FiEdit3, FiClock, FiCheck, FiFileText, FiUser } from 'react-icons/fi';

interface SimpleCopyEditStatusProps {
  manuscript: {
    _id: string;
    title: string;
    copyEditingStage?: string;
    assignedCopyEditor?: {
      name: string;
      email: string;
    };
    authorCopyEditReview?: {
      approved: boolean;
      reviewedAt: string;
    };
  };
  userEmail?: string;
  isAuthor?: boolean;
}

const SimpleCopyEditStatus: React.FC<SimpleCopyEditStatusProps> = ({ 
  manuscript, 
  userEmail, 
  isAuthor 
}) => {
  const getStageDisplay = (stage?: string) => {
    switch (stage) {
      case 'copy-editing':
        return {
          text: 'Copy Editing in Progress',
          description: 'Copy editor is working on language and style editing',
          color: 'orange',
          icon: FiEdit3
        };
      case 'author-review':
        return {
          text: 'Awaiting Author Review',
          description: 'Copy editing complete - waiting for author approval',
          color: 'blue',
          icon: FiClock
        };
      case 'ready-for-production':
        return {
          text: 'Ready for Production',
          description: 'Author approved - manuscript ready for final production',
          color: 'green',
          icon: FiCheck
        };
      default:
        return {
          text: 'Not Started',
          description: 'Copy editing has not been assigned yet',
          color: 'gray',
          icon: FiFileText
        };
    }
  };

  // Don't show if no copy editing stage
  if (!manuscript.copyEditingStage) {
    return null;
  }

  const stage = getStageDisplay(manuscript.copyEditingStage);
  const StageIcon = stage.icon;
  const canReview = manuscript.copyEditingStage === 'author-review' && isAuthor && !manuscript.authorCopyEditReview?.approved;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      border: '2px solid #e9ecef'
    }}>
      <h3 style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '0 0 1rem',
        color: '#333',
        fontSize: '1.2rem'
      }}>
        <FiFileText style={{ color: '#667eea' }} />
        Copy Editing Progress
      </h3>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500',
            backgroundColor: stage.color === 'orange' ? '#fff3cd' : 
                           stage.color === 'blue' ? '#cce7ff' :
                           stage.color === 'green' ? '#d4edda' : '#f8f9fa',
            color: stage.color === 'orange' ? '#856404' :
                   stage.color === 'blue' ? '#0066cc' :
                   stage.color === 'green' ? '#155724' : '#6c757d'
          }}>
            <StageIcon />
            {stage.text}
          </div>
        </div>

        {canReview && (
          <Link
            href={`/dashboard/manuscripts/${manuscript._id}/simple-review`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ffc107',
              color: '#000',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e0a800';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffc107';
            }}
          >
            <FiFileText />
            Review Copy-Edited Version
          </Link>
        )}
      </div>

      <p style={{
        margin: '0 0 1rem',
        color: '#666',
        lineHeight: '1.5'
      }}>
        {stage.description}
      </p>

      {manuscript.assignedCopyEditor && (
        <div style={{
          background: '#f8f9fa',
          padding: '1rem',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <FiUser style={{ color: '#667eea' }} />
            <strong>Copy Editor:</strong>
          </div>
          <div style={{ color: '#333' }}>
            {manuscript.assignedCopyEditor.name}
          </div>
        </div>
      )}

      {manuscript.authorCopyEditReview?.approved && (
        <div style={{
          background: '#d4edda',
          padding: '1rem',
          borderRadius: '8px',
          borderLeft: '4px solid #28a745',
          marginTop: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#155724',
            fontWeight: '500'
          }}>
            <FiCheck />
            Approved for Production
          </div>
          <div style={{ color: '#155724', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Approved on {new Date(manuscript.authorCopyEditReview.reviewedAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleCopyEditStatus;
