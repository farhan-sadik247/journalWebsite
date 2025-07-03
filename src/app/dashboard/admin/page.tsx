'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import styles from './AdminDashboard.module.scss';

interface DashboardStats {
  totalUsers: number;
  totalManuscripts: number;
  totalReviews: number;
  pendingReviews: number;
  submittedManuscripts: number;
  underReviewManuscripts: number;
  acceptedManuscripts: number;
  rejectedManuscripts: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalManuscripts: 0,
    totalReviews: 0,
    pendingReviews: 0,
    submittedManuscripts: 0,
    underReviewManuscripts: 0,
    acceptedManuscripts: 0,
    rejectedManuscripts: 0,
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      console.log('No session, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    console.log('Admin dashboard - checking access for user:', {
      email: session.user.email,
      role: session.user.role,
      roles: session.user.roles,
      currentActiveRole: session.user.currentActiveRole
    });

    // Check if user has admin role in their roles array or if their current active role is admin
    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    console.log('Admin access check result:', hasAdminAccess);

    if (!hasAdminAccess) {
      console.log('Access denied. User roles:', session.user.roles, 'Current role:', session.user.currentActiveRole);
      router.push('/dashboard');
      return;
    }

    console.log('Admin access granted, fetching dashboard data');
    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      // In a real implementation, you'd have dedicated admin API endpoints
      const [usersRes, manuscriptsRes, reviewsRes] = await Promise.all([
        fetch('/api/users?list=true'),
        fetch('/api/manuscripts?editor=true'),
        fetch('/api/reviews')
      ]);

      let totalUsers = 0;
      let users: User[] = [];
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        users = usersData.users || [];
        totalUsers = users.length;
        setRecentUsers(users.slice(0, 10)); // Show recent 10 users
      }

      let manuscripts: any[] = [];
      if (manuscriptsRes.ok) {
        const manuscriptsData = await manuscriptsRes.json();
        manuscripts = manuscriptsData.manuscripts || [];
      }

      let reviews: any[] = [];
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        reviews = reviewsData.reviews || [];
      }

      // Calculate stats
      const newStats: DashboardStats = {
        totalUsers,
        totalManuscripts: manuscripts.length,
        totalReviews: reviews.length,
        pendingReviews: reviews.filter(r => r.status === 'pending').length,
        submittedManuscripts: manuscripts.filter(m => m.status === 'submitted').length,
        underReviewManuscripts: manuscripts.filter(m => m.status === 'under-review').length,
        acceptedManuscripts: manuscripts.filter(m => m.status === 'accepted').length,
        rejectedManuscripts: manuscripts.filter(m => m.status === 'rejected').length,
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading admin dashboard...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>System overview and management</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>{stats.totalUsers}</h3>
          <p>Total Users</p>
        </div>
        <div className={styles.statCard}>
          <h3>{stats.totalManuscripts}</h3>
          <p>Total Manuscripts</p>
        </div>
        <div className={styles.statCard}>
          <h3>{stats.totalReviews}</h3>
          <p>Total Reviews</p>
        </div>
        <div className={styles.statCard}>
          <h3>{stats.pendingReviews}</h3>
          <p>Pending Reviews</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>Manuscript Statistics</h2>
          <div className={styles.manuscriptStats}>
            <div className={styles.statItem}>
              <span className={styles.label}>Submitted:</span>
              <span className={styles.value}>{stats.submittedManuscripts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.label}>Under Review:</span>
              <span className={styles.value}>{stats.underReviewManuscripts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.label}>Accepted:</span>
              <span className={styles.value}>{stats.acceptedManuscripts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.label}>Rejected:</span>
              <span className={styles.value}>{stats.rejectedManuscripts}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Recent Users</h2>
          <div className={styles.usersList}>
            {recentUsers.length === 0 ? (
              <p>No users found</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user._id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                  <div className={styles.userMeta}>
                    <span className={styles.role}>{user.role}</span>
                    <span className={styles.date}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Quick Actions</h2>
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/publication')}
            >
              Publication Dashboard
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/editor')}
            >
              Editorial Dashboard
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/reviewer')}
            >
              Review Dashboard
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/copy-editor')}
            >
              Copy Editor Dashboard
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/admin/manage-users')}
            >
              Manage Users
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/admin/role-applications')}
            >
              Role Applications
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/admin/fee-config')}
            >
              Publication Fees
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/admin/copy-editing')}
            >
              Copy Editor Assignment
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push('/dashboard/admin/home-management')}
            >
              Home Page Management
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
