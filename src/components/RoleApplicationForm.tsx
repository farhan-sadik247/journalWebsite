'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiUser, FiSend, FiX, FiFileText, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './RoleApplicationForm.module.scss';

interface RoleApplication {
  _id: string;
  requestedRole: string;
  motivation: string;
  qualifications: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewerComments?: string;
}

interface RoleApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoles: string[];
  onApplicationSubmitted: () => void;
}

export default function RoleApplicationForm({ 
  isOpen, 
  onClose, 
  currentRoles,
  onApplicationSubmitted 
}: RoleApplicationFormProps) {
  const { data: session } = useSession();
  const [requestedRole, setRequestedRole] = useState<'editor' | 'admin'>('editor');
  const [motivation, setMotivation] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
    }
  }, [isOpen]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/role-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const getAvailableRoles = () => {
    const roles = [];
    
    // Authors can apply to become editors
    if (currentRoles.includes('author') && !currentRoles.includes('editor')) {
      roles.push('editor');
    }
    
    // Editors can apply to become admins
    if (currentRoles.includes('editor') && !currentRoles.includes('admin')) {
      roles.push('admin');
    }
    
    return roles;
  };

  const hasPendingApplication = (role: string) => {
    return applications.some(app => app.requestedRole === role && app.status === 'pending');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivation.trim() || !qualifications.trim() || !experience.trim()) {
      toast.error('All fields are required');
      return;
    }

    if (hasPendingApplication(requestedRole)) {
      toast.error(`You already have a pending application for ${requestedRole} role`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/role-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestedRole,
          motivation: motivation.trim(),
          qualifications: qualifications.trim(),
          experience: experience.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application submitted successfully!');
        setMotivation('');
        setQualifications('');
        setExperience('');
        fetchApplications();
        onApplicationSubmitted();
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock className={styles.pendingIcon} />;
      case 'approved': return <FiCheck className={styles.approvedIcon} />;
      case 'rejected': return <FiXCircle className={styles.rejectedIcon} />;
      default: return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return styles.pending;
      case 'approved': return styles.approved;
      case 'rejected': return styles.rejected;
      default: return '';
    }
  };

  if (!isOpen) return null;

  const availableRoles = getAvailableRoles();

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>
            <FiUser />
            Role Promotion Application
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {availableRoles.length === 0 ? (
            <div className={styles.noRoles}>
              <FiFileText className={styles.noRolesIcon} />
              <h3>No Role Promotions Available</h3>
              <p>
                {currentRoles.includes('admin') 
                  ? 'You already have the highest role level.'
                  : currentRoles.includes('editor')
                  ? 'You can apply for admin role once you have more experience as an editor.'
                  : 'You can apply for editor role as an author.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className={styles.info}>
                <h3>Role Promotion Guidelines</h3>
                <ul>
                  <li><strong>Author → Editor:</strong> Authors can apply to become editors</li>
                  <li><strong>Editor → Admin:</strong> Editors can apply to become administrators</li>
                  <li>All applications are reviewed by current administrators</li>
                  <li>Provide detailed information about your qualifications and motivation</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="requestedRole">Requested Role</label>
                  <select
                    id="requestedRole"
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as 'editor' | 'admin')}
                    className={styles.select}
                    disabled={availableRoles.length === 1}
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                  {hasPendingApplication(requestedRole) && (
                    <p className={styles.warning}>
                      You have a pending application for this role
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="motivation">Motivation (Why do you want this role?)</label>
                  <textarea
                    id="motivation"
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Explain your motivation for applying for this role..."
                    className={styles.textarea}
                    maxLength={1000}
                    rows={4}
                    required
                  />
                  <span className={styles.charCount}>{motivation.length}/1000</span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="qualifications">Qualifications & Education</label>
                  <textarea
                    id="qualifications"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="Describe your relevant qualifications, education, degrees, certifications..."
                    className={styles.textarea}
                    maxLength={1000}
                    rows={4}
                    required
                  />
                  <span className={styles.charCount}>{qualifications.length}/1000</span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="experience">Relevant Experience</label>
                  <textarea
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Describe your relevant work experience, research, publications, editorial experience..."
                    className={styles.textarea}
                    maxLength={1000}
                    rows={4}
                    required
                  />
                  <span className={styles.charCount}>{experience.length}/1000</span>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="btn btn-secondary"
                  >
                    <FiFileText />
                    {showHistory ? 'Hide' : 'View'} Application History
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || hasPendingApplication(requestedRole)}
                  >
                    <FiSend />
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </>
          )}

          {showHistory && (
            <div className={styles.history}>
              <h3>Application History</h3>
              {applications.length === 0 ? (
                <p>No applications submitted yet.</p>
              ) : (
                <div className={styles.applicationsList}>
                  {applications.map(app => (
                    <div key={app._id} className={`${styles.applicationItem} ${getStatusClass(app.status)}`}>
                      <div className={styles.applicationHeader}>
                        <div className={styles.roleAndStatus}>
                          <span className={styles.role}>{app.requestedRole}</span>
                          <span className={`${styles.status} ${getStatusClass(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {app.status}
                          </span>
                        </div>
                        <span className={styles.date}>
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {app.reviewerComments && (
                        <div className={styles.comments}>
                          <strong>Admin Comments:</strong> {app.reviewerComments}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
