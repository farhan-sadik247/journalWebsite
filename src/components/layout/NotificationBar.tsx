'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './NotificationBar.module.scss';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  manuscriptId?: {
    title: string;
    submissionId: string;
  };
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

const NotificationBar = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    setIsOpen(false);
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchNotifications();
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session?.user?.email) {
    return null;
  }

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return styles.urgent;
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      default: return styles.low;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manuscript_status': return '📄';
      case 'payment_required': return '💳';
      case 'payment_confirmed': return '✅';
      case 'review_assignment': return '🔍';
      case 'review_submitted': return '📝';
      case 'copy_edit_assigned': return '✏️';
      case 'draft_ready': return '📝';
      case 'publication_ready': return '📰';
      case 'admin_action': return '⚙️';
      default: return '🔔';
    }
  };

  return (
    <div className={styles.notificationContainer}>
      <button
        className={styles.notificationBell}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.notificationDropdown}>
          <div className={styles.notificationHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllButton}
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`${styles.notificationItem} ${
                    !notification.isRead ? styles.unread : ''
                  } ${getPriorityClass(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.notificationIcon}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                    </div>
                    <div className={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div className={styles.notificationMeta}>
                      {new Date(notification.createdAt).toLocaleDateString()}
                      {notification.manuscriptId && (
                        <span className={styles.manuscriptInfo}>
                          • {notification.manuscriptId.title}
                        </span>
                      )}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className={styles.unreadDot}></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className={styles.notificationFooter}>
              <a href="/dashboard/notifications" className={styles.viewAllLink}>
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBar;
