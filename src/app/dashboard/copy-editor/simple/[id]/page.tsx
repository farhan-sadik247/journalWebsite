'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiUpload, FiDownload, FiCheck, FiClock, FiUser, FiCalendar, FiFileText, FiSend } from 'react-icons/fi';

interface GalleyProof {
  file: string;
  submittedAt: string;
  notes?: string;
}

interface CopyEditorAssignment {
  copyEditorId: string;
  copyEditorEmail: string;
  assignedAt: string;
  galleyProofs?: GalleyProof[];
  authorApprovalStatus?: 'pending' | 'approved' | 'rejected';
  authorApprovalDate?: string;
  copyEditorConfirmed?: boolean;
  copyEditorConfirmationDate?: string;
  confirmationReport?: string;
}

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{
    name: string;
    email: string;
  }>;
  abstract: string;
  status: string;
  copyEditorAssignment?: CopyEditorAssignment;
  files?: Array<{
    filename: string;
    originalName: string;
    uploadedAt: string;
  }>;
}

export default function CopyEditorWorkPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [galleyFiles, setGalleyFiles] = useState<FileList | null>(null);
  const [galleyNotes, setGalleyNotes] = useState('');
  const [confirmationReport, setConfirmationReport] = useState('');

  const manuscriptId = params?.id as string;

  useEffect(() => {
    if (session?.user?.email && manuscriptId) {
      fetchManuscript();
    }
  }, [session, manuscriptId]);

  const fetchManuscript = async () => {
    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if current user is assigned as copy editor
        if (!data.copyEditorAssignment || 
            data.copyEditorAssignment.copyEditorEmail !== session?.user?.email) {
          setError('You are not assigned as the copy editor for this manuscript.');
          return;
        }
        
        setManuscript(data);
      } else {
        setError('Failed to fetch manuscript details.');
      }
    } catch (err) {
      setError('An error occurred while fetching manuscript details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGalleyProofSubmission = async () => {
    if (!galleyFiles || galleyFiles.length === 0) {
      alert('Please select at least one galley proof file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      // Add files
      for (let i = 0; i < galleyFiles.length; i++) {
        formData.append('galleyProofs', galleyFiles[i]);
      }
      
      if (galleyNotes.trim()) {
        formData.append('notes', galleyNotes.trim());
      }

      const response = await fetch(`/api/manuscripts/${manuscriptId}/submit-galley-proof`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Galley proofs submitted successfully!');
        setGalleyFiles(null);
        setGalleyNotes('');
        fetchManuscript(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to submit galley proofs: ${errorData.message}`);
      }
    } catch (error) {
      alert('An error occurred while submitting galley proofs.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyEditorConfirmation = async () => {
    if (!confirmationReport.trim()) {
      alert('Please provide a confirmation report.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/copy-editor-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationReport: confirmationReport.trim(),
        }),
      });

      if (response.ok) {
        alert('Confirmation submitted successfully! The editor has been notified.');
        setConfirmationReport('');
        fetchManuscript(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to submit confirmation: ${errorData.message}`);
      }
    } catch (error) {
      alert('An error occurred while submitting confirmation.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/download/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download file.');
      }
    } catch (error) {
      alert('An error occurred while downloading the file.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
          Manuscript not found.
        </div>
      </div>
    );
  }

  const assignment = manuscript.copyEditorAssignment!;
  const hasGalleyProofs = assignment.galleyProofs && assignment.galleyProofs.length > 0;
  const isAuthorApproved = assignment.authorApprovalStatus === 'approved';
  const isCopyEditorConfirmed = assignment.copyEditorConfirmed;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Copy Editor Work</h1>
          <div className="text-gray-600">
            <p className="flex items-center mb-1">
              <FiUser className="mr-2" />
              Assigned to: {assignment.copyEditorEmail}
            </p>
            <p className="flex items-center">
              <FiCalendar className="mr-2" />
              Assigned on: {new Date(assignment.assignedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Manuscript Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Manuscript Details</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">{manuscript.title}</h3>
            <p className="text-gray-600 mb-2">
              <strong>Authors:</strong> {manuscript.authors.map(author => author.name).join(', ')}
            </p>
            <p className="text-gray-600 mb-2">
              <strong>Status:</strong> {manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Abstract:</h4>
              <p className="text-gray-700">{manuscript.abstract}</p>
            </div>
          </div>
        </div>

        {/* Original Files */}
        {manuscript.files && manuscript.files.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Original Manuscript Files</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {manuscript.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <FiFileText className="mr-2 text-blue-500" />
                    <span className="text-gray-700">{file.originalName}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({new Date(file.uploadedAt).toLocaleDateString()})
                    </span>
                  </div>
                  <button
                    onClick={() => downloadFile(file.filename)}
                    className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <FiDownload className="mr-1" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Status */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Workflow Status</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${hasGalleyProofs ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={hasGalleyProofs ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                Galley Proofs Submitted
              </span>
              {hasGalleyProofs && (
                <FiCheck className="ml-2 text-green-500" />
              )}
            </div>
            
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${isAuthorApproved ? 'bg-green-500' : hasGalleyProofs ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <span className={isAuthorApproved ? 'text-green-700 font-semibold' : hasGalleyProofs ? 'text-yellow-700' : 'text-gray-600'}>
                Author Approval
              </span>
              {isAuthorApproved && (
                <FiCheck className="ml-2 text-green-500" />
              )}
              {hasGalleyProofs && !isAuthorApproved && (
                <FiClock className="ml-2 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${isCopyEditorConfirmed ? 'bg-green-500' : isAuthorApproved ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <span className={isCopyEditorConfirmed ? 'text-green-700 font-semibold' : isAuthorApproved ? 'text-yellow-700' : 'text-gray-600'}>
                Copy Editor Confirmation
              </span>
              {isCopyEditorConfirmed && (
                <FiCheck className="ml-2 text-green-500" />
              )}
              {isAuthorApproved && !isCopyEditorConfirmed && (
                <FiClock className="ml-2 text-yellow-500" />
              )}
            </div>
          </div>
        </div>

        {/* Galley Proof Submission */}
        {!hasGalleyProofs && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Submit Galley Proofs</h3>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Galley Proof Files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setGalleyFiles(e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={galleyNotes}
                  onChange={(e) => setGalleyNotes(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about the galley proofs..."
                />
              </div>
              
              <button
                onClick={handleGalleyProofSubmission}
                disabled={uploading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <FiUpload className="mr-2" />
                {uploading ? 'Uploading...' : 'Submit Galley Proofs'}
              </button>
            </div>
          </div>
        )}

        {/* Display Submitted Galley Proofs */}
        {hasGalleyProofs && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Submitted Galley Proofs</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              {assignment.galleyProofs!.map((proof, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FiFileText className="mr-2 text-green-600" />
                      <span className="font-medium">{proof.file}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(proof.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  {proof.notes && (
                    <p className="text-gray-600 mt-2 ml-6">{proof.notes}</p>
                  )}
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-500">
                <p className="text-yellow-800">
                  <strong>Status:</strong> Waiting for author approval
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Copy Editor Confirmation */}
        {isAuthorApproved && !isCopyEditorConfirmed && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Final Confirmation</h3>
            <div className="bg-green-50 p-6 rounded-lg">
              <p className="text-green-800 mb-4">
                <strong>Great!</strong> The author has approved the galley proofs. 
                Please provide a final confirmation report to complete the copy-editing process.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation Report
                </label>
                <textarea
                  value={confirmationReport}
                  onChange={(e) => setConfirmationReport(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Provide a summary of the copy-editing work completed and confirmation that the manuscript is ready for publication..."
                />
              </div>
              
              <button
                onClick={handleCopyEditorConfirmation}
                disabled={submitting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <FiSend className="mr-2" />
                {submitting ? 'Submitting...' : 'Submit Final Confirmation'}
              </button>
            </div>
          </div>
        )}

        {/* Completion Status */}
        {isCopyEditorConfirmed && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Process Complete</h3>
            <div className="bg-green-100 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FiCheck className="text-green-600 mr-2 text-xl" />
                <span className="text-green-800 font-semibold">Copy-editing process completed!</span>
              </div>
              
              <p className="text-green-700 mb-2">
                Confirmation submitted on: {new Date(assignment.copyEditorConfirmationDate!).toLocaleString()}
              </p>
              
              {assignment.confirmationReport && (
                <div className="mt-4">
                  <h4 className="font-semibold text-green-800 mb-2">Final Report:</h4>
                  <p className="text-green-700 bg-white p-3 rounded border">
                    {assignment.confirmationReport}
                  </p>
                </div>
              )}
              
              <p className="text-green-700 mt-4">
                The editor has been notified and can now proceed with the publication process.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
