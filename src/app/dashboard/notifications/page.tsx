'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiBell, FiCheck, FiTrash2, FiExternalLink, FiFilter, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './Notifications.module.scss';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    priority?: string;
    actionUrl?: string;
    createdBy?: string;
  };
  relatedManuscript?: {
    title: string;
    submissionId: string;
  };
  relatedPayment?: {
    amount: number;
    status: string;
  };
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user) {
      fetchNotifications();
    }
  }, [session, status, router, filter]);

  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        page: page.toString(),
        ...(filter === 'unread' && { unreadOnly: 'true' })
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        toast.success('Notification marked as read');
      } else {
        toast.error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAllRead' }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        toast.success('All notifications marked as read');
      } else {
        toast.error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    if (notification.metadata?.actionUrl) {
      router.push(notification.metadata.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'manuscript_status':
      case 'review_assignment':
      case 'review_submitted':
        return '📄';
      case 'payment_required':
      case 'payment_confirmed':
        return '💳';
      case 'admin_action':
        return '⚡';
      case 'role_application':
        return '👤';
      case 'copy_edit_assigned':
      case 'draft_ready':
        return '✏️';
      case 'publication_ready':
        return '📚';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#2563eb';
      case 'low':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.notificationsPage}>
        <div className="container">
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={styles.notificationsPage}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <FiBell className={styles.headerIcon} />
            <div>
              <h1>Notifications</h1>
              <p>Stay updated with all your activities and updates</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="btn btn-secondary"
              disabled={loading}
            >
              <FiRefreshCw />
              Refresh
            </button>
            <button
              onClick={markAllAsRead}
              className="btn btn-primary"
              disabled={loading || notifications.length === 0}
            >
              <FiCheck />
              Mark All Read
            </button>
          </div>
        </div>

        <div className={styles.filtersSection}>
          <div className={styles.filters}>
            <button
              onClick={() => setFilter('all')}
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
            >
              Unread Only
            </button>
          </div>
          <div className={styles.notificationCount}>
            {pagination.total} total notifications
          </div>
        </div>

        <div className={styles.notificationsList}>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <FiBell className={styles.emptyIcon} />
              <h3>No notifications</h3>
              <p>
                {filter === 'unread' 
                  ? "You don't have any unread notifications."
                  : "You don't have any notifications yet."
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4>{notification.title}</h4>
                    <div className={styles.notificationMeta}>
                      {notification.metadata?.priority && (
                        <span 
                          className={styles.priorityBadge}
                          style={{ backgroundColor: getPriorityColor(notification.metadata.priority) }}
                        >
                          {notification.metadata.priority}
                        </span>
                      )}
                      <span className={styles.timestamp}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className={styles.notificationMessage}>{notification.message}</p>
                  {notification.relatedManuscript && (
                    <div className={styles.relatedInfo}>
                      📄 Related to: {notification.relatedManuscript.title}
                    </div>
                  )}
                  {notification.metadata?.actionUrl && (
                    <div className={styles.actionButton}>
                      <FiExternalLink />
                      View Details
                    </div>
                  )}
                </div>
                {!notification.isRead && (
                  <div className={styles.unreadIndicator} />
                )}
              </div>
            ))
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => fetchNotifications(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchNotifications(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
