'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiBookOpen, 
  FiUsers, 
  FiEdit, 
  FiEye, 
  FiDownload, 
  FiClock, 
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiShield,
  FiFileText,
  FiCreditCard,
  FiDollarSign
} from 'react-icons/fi';
import styles from './Dashboard.module.scss';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    underReview: 0,
    accepted: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Remove automatic role-based redirection
    // Users can now stay on the main dashboard regardless of role
  }, [status, session, router]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/manuscripts');
      
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data.manuscripts);
        
        // Calculate stats
        const totalSubmissions = data.manuscripts.length;
        const underReview = data.manuscripts.filter((m: any) => m.status === 'under-review').length;
        const accepted = data.manuscripts.filter((m: any) => m.status === 'accepted').length;
        const rejected = data.manuscripts.filter((m: any) => m.status === 'rejected').length;
        
        setStats({ totalSubmissions, underReview, accepted, rejected });
      } else {
        console.error('Failed to fetch dashboard data:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'submitted': 'status-submitted',
      'under-review': 'status-under-review',
      'revision-requested': 'status-revision-requested',
      'major-revision-requested': 'status-major-revision',
      'minor-revision-requested': 'status-minor-revision',
      'under-editorial-review': 'status-under-editorial-review',
      'reviewed': 'status-reviewed',
      'accepted': 'status-accepted',
      'accepted-awaiting-copy-edit': 'status-accepted',
      'in-copy-editing': 'status-in-production',
      'copy-editing-complete': 'status-in-production',
      'rejected': 'status-rejected',
      'payment-required': 'status-payment-required',
      'in-production': 'status-in-production',
      'published': 'status-published',
    };
    
    return `status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-submitted'}`;
  };

  const getStatusDisplayText = (status: string) => {
    const statusTexts = {
      'submitted': 'Submitted',
      'under-review': 'Under Review',
      'revision-requested': 'Revision Requested',
      'major-revision-requested': 'Major Revision Required',
      'minor-revision-requested': 'Minor Revision Required',
      'under-editorial-review': 'Under Editorial Review',
      'reviewed': 'Reviewed',
      'accepted': 'Accepted',
      'accepted-awaiting-copy-edit': 'Accepted - Awaiting Copy Edit',
      'in-copy-editing': 'In Copy Editing',
      'copy-editing-complete': 'Copy Editing Complete',
      'rejected': 'Rejected',
      'payment-required': 'Payment Required',
      'in-production': 'In Production',
      'published': 'Published',
    };
    
    return statusTexts[status as keyof typeof statusTexts] || status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const quickActions = [
    {
      title: 'Submit New Manuscript',
      description: 'Start a new manuscript submission',
      icon: FiPlus,
      href: '/submit',
      color: 'primary',
    },
    {
      title: 'Browse Articles',
      description: 'Explore published research',
      icon: FiSearch,
      href: '/articles',
      color: 'secondary',
    },
    {
      title: 'Payment Status',
      description: 'View APC payments and invoices',
      icon: FiCreditCard,
      href: '/dashboard/payments',
      color: 'info',
    },
    {
      title: 'Review Assignments',
      description: 'View your review tasks',
      icon: FiEdit,
      href: '/dashboard/review-assignments',
      color: 'accent',
      show: session.user.roles?.includes('reviewer') || session.user.roles?.includes('editor') || session.user.currentActiveRole === 'reviewer' || session.user.currentActiveRole === 'editor',
    },
  ];

  // Role-specific dashboard links
  const roleBasedActions = [];
  
  if (session.user.roles?.includes('admin')) {
    roleBasedActions.push({
      title: 'Admin Dashboard',
      description: 'Manage users and system settings',
      icon: FiShield,
      href: '/dashboard/admin',
      color: 'danger',
    });
    roleBasedActions.push({
      title: 'Payment Management',
      description: 'Manage APC fees and payments',
      icon: FiDollarSign,
      href: '/dashboard/payments?view=admin',
      color: 'success',
    });
  }
  
  if (session.user.roles?.includes('editor')) {
    roleBasedActions.push({
      title: 'Editorial Dashboard',
      description: 'Manage manuscripts and reviews',
      icon: FiEdit,
      href: '/dashboard/editor',
      color: 'warning',
    });
    roleBasedActions.push({
      title: 'Publication Dashboard',
      description: 'Manage manuscripts ready for publication',
      icon: FiBookOpen,
      href: '/dashboard/publication',
      color: 'primary',
    });
    roleBasedActions.push({
      title: 'Payment Oversight',
      description: 'Review APC payments and waivers',
      icon: FiDollarSign,
      href: '/dashboard/payments?view=editor',
      color: 'success',
    });
  }
  
  if (session.user.roles?.includes('reviewer')) {
    roleBasedActions.push({
      title: 'Reviewer Dashboard',
      description: 'View assigned reviews',
      icon: FiFileText,
      href: '/dashboard/reviewer',
      color: 'info',
    });
  }

  if (session.user.roles?.includes('copy-editor') || session.user.currentActiveRole === 'copy-editor') {
    roleBasedActions.push({
      title: 'Copy Editor Dashboard',
      description: 'Manage copy editing assignments',
      icon: FiEdit,
      href: '/dashboard/copy-editor',
      color: 'primary',
    });
  }

  return (
    <div className={styles.dashboard}>
      <div className="container">
          {/* Welcome Section */}
          <div className={styles.welcomeSection}>
            <div className={styles.welcomeContent}>
              <h1>Welcome back, {session.user.name}!</h1>
              <p>Here&apos;s what&apos;s happening with your research activities.</p>
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userRole}>
                <span className="status-badge status-published">
                  {(() => {
                    // Determine the display role with proper fallback logic
                    const primaryRole = session.user.currentActiveRole || session.user.role;
                    
                    // If user has multiple roles but no currentActiveRole set, 
                    // default to their primary role from roles array
                    if (!session.user.currentActiveRole && session.user.roles?.length > 0) {
                      // Use the first non-author role if available, otherwise use the first role
                      const nonAuthorRole = session.user.roles.find(role => role !== 'author');
                      const displayRole = nonAuthorRole || session.user.roles[0];
                      return displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
                    }
                    
                    return primaryRole?.charAt(0).toUpperCase() + primaryRole?.slice(1) || 'Author';
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiBookOpen />
              </div>
              <div className={styles.statContent}>
                <h3>{stats.totalSubmissions}</h3>
                <p>Total Submissions</p>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiClock />
              </div>
              <div className={styles.statContent}>
                <h3>{stats.underReview}</h3>
                <p>Under Review</p>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiCheckCircle />
              </div>
              <div className={styles.statContent}>
                <h3>{stats.accepted}</h3>
                <p>Accepted</p>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiUsers />
              </div>
              <div className={styles.statContent}>
                <h3>{stats.rejected}</h3>
                <p>Rejected</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={styles.actionsGrid}>
              {quickActions
                .filter(action => action.show !== false)
                .map((action, index) => (
                <Link key={index} href={action.href} className={styles.actionCard}>
                  <div className={`${styles.actionIcon} ${styles[action.color]}`}>
                    <action.icon />
                  </div>
                  <div className={styles.actionContent}>
                    <h3>{action.title}</h3>
                    <p>{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Role-Based Dashboards */}
          {roleBasedActions.length > 0 && (
            <div className={styles.quickActions}>
              <h2>Role-Based Dashboards</h2>
              <div className={styles.actionsGrid}>
                {roleBasedActions.map((action, index) => (
                  <Link key={index} href={action.href} className={styles.actionCard}>
                    <div className={`${styles.actionIcon} ${styles[action.color]}`}>
                      <action.icon />
                    </div>
                    <div className={styles.actionContent}>
                      <h3>{action.title}</h3>
                      <p>{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Manuscripts */}
          <div className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h2>Recent Manuscripts</h2>
              <Link href="/dashboard/manuscripts" className="btn btn-secondary">
                View All
              </Link>
            </div>
            
            {manuscripts.length > 0 ? (
              <div className={styles.manuscriptsList}>
                {manuscripts.slice(0, 5).map((manuscript: any) => (
                  <div key={manuscript._id} className={styles.manuscriptCard}>
                    <div className={styles.manuscriptHeader}>
                      <h3>
                        <Link href={`/dashboard/manuscripts/${manuscript._id}`}>
                          {manuscript.title}
                        </Link>
                      </h3>
                      <span className={getStatusBadge(manuscript.status)}>
                        {getStatusDisplayText(manuscript.status)}
                      </span>
                    </div>
                    
                    <div className={styles.manuscriptMeta}>
                      <span>
                        Category: {manuscript.category}
                      </span>
                      <span>
                        Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className={styles.manuscriptActions}>
                      <Link 
                        href={`/dashboard/manuscripts/${manuscript._id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        <FiEye />
                        View
                      </Link>
                      {manuscript.files?.length > 0 && (
                        <button 
                          onClick={() => {
                            try {
                              window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank');
                            } catch (error) {
                              console.error('Download failed:', error);
                              alert('Download feature is currently unavailable. Please try again later.');
                            }
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <FiDownload />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FiBookOpen />
                <h3>No manuscripts yet</h3>
                <p>Start by submitting your first manuscript to get started.</p>
                <p className="text-sm text-gray-500">
                  (Found {manuscripts.length} manuscripts for your account)
                </p>
                <Link href="/submit" className="btn btn-primary">
                  Submit Manuscript
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
