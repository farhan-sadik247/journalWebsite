'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiUser, FiClock, FiCheck, FiX, FiEye, FiArrowLeft, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from './RoleApplications.module.scss';

interface RoleApplication {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  currentRole: string;
  requestedRole: string;
  motivation: string;
  qualifications: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  reviewerComments?: string;
}

export default function RoleApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<RoleApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<RoleApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      if (!session?.user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchApplications();
    }
  }, [session, status, router]);

  useEffect(() => {
    // Filter applications
    let filtered = applications;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(app => app.requestedRole === roleFilter);
    }

    setFilteredApplications(filtered);
  }, [applications, statusFilter, roleFilter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/role-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      } else {
        toast.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/role-applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status: newStatus,
          comments: reviewComments.trim()
        }),
      });

      if (response.ok) {
        toast.success(`Application ${newStatus} successfully`);
        setShowModal(false);
        setSelectedApplication(null);
        setReviewComments('');
        fetchApplications();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to review application');
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error('Failed to review application');
    }
  };

  const openReviewModal = (application: RoleApplication) => {
    setSelectedApplication(application);
    setReviewComments('');
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { class: styles.pending, icon: <FiClock />, text: 'Pending' },
      approved: { class: styles.approved, icon: <FiCheck />, text: 'Approved' },
      rejected: { class: styles.rejected, icon: <FiX />, text: 'Rejected' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`${styles.statusBadge} ${config.class}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className={styles.applicationsPage}>
        <div className="container">
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.roles?.includes('admin')) {
    return null;
  }

  return (
    <div className={styles.applicationsPage}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <Link href="/dashboard/admin" className={styles.backButton}>
              <FiArrowLeft />
              Back to Admin Dashboard
            </Link>
          </div>
          <h1>Role Applications</h1>
          <p>Review and manage user role promotion requests</p>
        </div>

        <div className={styles.content}>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <FiFilter className={styles.filterIcon} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Roles</option>
                <option value="editor">Editor Applications</option>
                <option value="admin">Admin Applications</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <h3>{applications.length}</h3>
              <p>Total Applications</p>
            </div>
            <div className={styles.statCard}>
              <h3>{applications.filter(a => a.status === 'pending').length}</h3>
              <p>Pending Review</p>
            </div>
            <div className={styles.statCard}>
              <h3>{applications.filter(a => a.status === 'approved').length}</h3>
              <p>Approved</p>
            </div>
            <div className={styles.statCard}>
              <h3>{applications.filter(a => a.status === 'rejected').length}</h3>
              <p>Rejected</p>
            </div>
          </div>

          {/* Applications List */}
          <div className={styles.applicationsCard}>
            <div className={styles.cardHeader}>
              <h2>Applications ({filteredApplications.length})</h2>
            </div>
            
            {filteredApplications.length === 0 ? (
              <div className={styles.emptyState}>
                <FiUser className={styles.emptyIcon} />
                <h3>No applications found</h3>
                <p>No role applications match your current filters.</p>
              </div>
            ) : (
              <div className={styles.applicationsList}>
                {filteredApplications.map((application) => (
                  <div key={application._id} className={styles.applicationItem}>
                    <div className={styles.applicationInfo}>
                      <div className={styles.applicantDetails}>
                        <h4>{application.userName}</h4>
                        <p className={styles.email}>{application.userEmail}</p>
                        <div className={styles.roleTransition}>
                          <span className={styles.currentRole}>{application.currentRole}</span>
                          <span className={styles.arrow}>→</span>
                          <span className={styles.requestedRole}>{application.requestedRole}</span>
                        </div>
                        <p className={styles.submittedDate}>
                          Submitted: {new Date(application.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.applicationStatus}>
                        {getStatusBadge(application.status)}
                        {application.reviewedAt && (
                          <p className={styles.reviewedDate}>
                            Reviewed: {new Date(application.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.applicationActions}>
                      <button
                        onClick={() => openReviewModal(application)}
                        className="btn btn-secondary"
                      >
                        <FiEye />
                        {application.status === 'pending' ? 'Review' : 'View Details'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {showModal && selectedApplication && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>
                  {selectedApplication.status === 'pending' ? 'Review Application' : 'Application Details'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={styles.closeButton}
                >
                  <FiX />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.applicantInfo}>
                  <h4>Applicant Information</h4>
                  <div className={styles.infoGrid}>
                    <div>
                      <strong>Name:</strong> {selectedApplication.userName}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedApplication.userEmail}
                    </div>
                    <div>
                      <strong>Current Role:</strong> {selectedApplication.currentRole}
                    </div>
                    <div>
                      <strong>Requested Role:</strong> {selectedApplication.requestedRole}
                    </div>
                  </div>
                </div>

                <div className={styles.applicationDetails}>
                  <div className={styles.detailSection}>
                    <h5>Motivation</h5>
                    <p>{selectedApplication.motivation}</p>
                  </div>
                  <div className={styles.detailSection}>
                    <h5>Qualifications & Education</h5>
                    <p>{selectedApplication.qualifications}</p>
                  </div>
                  <div className={styles.detailSection}>
                    <h5>Relevant Experience</h5>
                    <p>{selectedApplication.experience}</p>
                  </div>
                </div>

                {selectedApplication.status !== 'pending' && (
                  <div className={styles.reviewInfo}>
                    <h4>Review Information</h4>
                    <div className={styles.reviewDetails}>
                      <div>
                        <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                      </div>
                      <div>
                        <strong>Reviewed By:</strong> {selectedApplication.reviewedBy?.name}
                      </div>
                      <div>
                        <strong>Review Date:</strong> {selectedApplication.reviewedAt ? new Date(selectedApplication.reviewedAt).toLocaleDateString() : 'N/A'}
                      </div>
                      {selectedApplication.reviewerComments && (
                        <div className={styles.reviewComments}>
                          <strong>Comments:</strong>
                          <p>{selectedApplication.reviewerComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedApplication.status === 'pending' && (
                  <div className={styles.reviewSection}>
                    <h4>Review Decision</h4>
                    <div className={styles.formGroup}>
                      <label htmlFor="reviewComments">Comments (optional)</label>
                      <textarea
                        id="reviewComments"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Add comments about your decision..."
                        className={styles.textarea}
                        rows={4}
                        maxLength={500}
                      />
                      <span className={styles.charCount}>{reviewComments.length}/500</span>
                    </div>
                    <div className={styles.reviewActions}>
                      <button
                        onClick={() => handleReviewApplication(selectedApplication._id, 'rejected')}
                        className="btn btn-danger"
                      >
                        <FiX />
                        Reject Application
                      </button>
                      <button
                        onClick={() => handleReviewApplication(selectedApplication._id, 'approved')}
                        className="btn btn-success"
                      >
                        <FiCheck />
                        Approve Application
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
