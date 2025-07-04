'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiMail, FiPhone, FiClock, FiEye, FiCheck, FiX, FiSend } from 'react-icons/fi';
import styles from './ContactMessages.module.scss';

interface ContactMessage {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'resolved';
  adminResponse?: string;
  respondedBy?: {
    name: string;
    email: string;
  };
  respondedAt?: string;
  createdAt: string;
}

export default function ContactMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // Check if user is admin
    const isAdmin = session.user.role === 'admin' || 
                   session.user.roles?.includes('admin') || 
                   session.user.isFounder;

    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchMessages();
  }, [session, status, router, filterStatus]);

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        limit: '50'
      });
      
      const response = await fetch(`/api/contact?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string) => {
    try {
      const response = await fetch(`/api/contact/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchMessages();
      } else {
        console.error('Failed to update message status');
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const handleResponse = async () => {
    if (!selectedMessage || !responseText.trim()) return;

    setIsResponding(true);
    try {
      const response = await fetch(`/api/contact/${selectedMessage._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'replied',
          adminResponse: responseText 
        }),
      });

      if (response.ok) {
        setSelectedMessage(null);
        setResponseText('');
        fetchMessages();
      } else {
        console.error('Failed to send response');
      }
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsResponding(false);
    }
  };

  const getSubjectLabel = (subject: string) => {
    const labels = {
      submission: 'Manuscript Submission',
      review: 'Peer Review Process',
      editorial: 'Editorial Inquiry',
      technical: 'Technical Support',
      partnership: 'Partnership Opportunity',
      other: 'Other'
    };
    return labels[subject as keyof typeof labels] || subject;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#ef4444';
      case 'read': return '#f59e0b';
      case 'replied': return '#10b981';
      case 'resolved': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading contact messages...</p>
      </div>
    );
  }

  return (
    <div className={styles.contactMessages}>
      <div className="container">
        <div className={styles.header}>
          <h1>Contact Messages</h1>
          <div className={styles.filters}>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.statusFilter}
            >
              <option value="all">All Messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className={styles.messagesList}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <FiMail className={styles.emptyIcon} />
              <h3>No messages found</h3>
              <p>No contact messages match the current filter.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message._id} className={styles.messageCard}>
                <div className={styles.messageHeader}>
                  <div className={styles.messageInfo}>
                    <h3>{message.firstName} {message.lastName}</h3>
                    <div className={styles.messageDetails}>
                      <span className={styles.email}>
                        <FiMail /> {message.email}
                      </span>
                      {message.phone && (
                        <span className={styles.phone}>
                          <FiPhone /> {message.phone}
                        </span>
                      )}
                      <span className={styles.date}>
                        <FiClock /> {new Date(message.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.messageActions}>
                    <span 
                      className={styles.status}
                      style={{ backgroundColor: getStatusColor(message.status) }}
                    >
                      {message.status}
                    </span>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => setSelectedMessage(message)}
                        className={styles.viewButton}
                      >
                        <FiEye /> View
                      </button>
                      {message.status === 'new' && (
                        <button
                          onClick={() => updateMessageStatus(message._id, 'read')}
                          className={styles.markReadButton}
                        >
                          <FiCheck /> Mark Read
                        </button>
                      )}
                      {message.status !== 'resolved' && (
                        <button
                          onClick={() => updateMessageStatus(message._id, 'resolved')}
                          className={styles.resolveButton}
                        >
                          <FiX /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.messagePreview}>
                  <strong>Subject:</strong> {getSubjectLabel(message.subject)}
                  <p>{message.message.substring(0, 150)}...</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Details Modal */}
        {selectedMessage && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Message Details</h2>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className={styles.closeButton}
                >
                  <FiX />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.messageDetails}>
                  <div className={styles.detail}>
                    <strong>From:</strong> {selectedMessage.firstName} {selectedMessage.lastName}
                  </div>
                  <div className={styles.detail}>
                    <strong>Email:</strong> {selectedMessage.email}
                  </div>
                  {selectedMessage.phone && (
                    <div className={styles.detail}>
                      <strong>Phone:</strong> {selectedMessage.phone}
                    </div>
                  )}
                  <div className={styles.detail}>
                    <strong>Subject:</strong> {getSubjectLabel(selectedMessage.subject)}
                  </div>
                  <div className={styles.detail}>
                    <strong>Date:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}
                  </div>
                  <div className={styles.detail}>
                    <strong>Status:</strong> 
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(selectedMessage.status) }}
                    >
                      {selectedMessage.status}
                    </span>
                  </div>
                </div>
                <div className={styles.messageContent}>
                  <strong>Message:</strong>
                  <div className={styles.messageText}>
                    {selectedMessage.message}
                  </div>
                </div>
                {selectedMessage.adminResponse && (
                  <div className={styles.adminResponse}>
                    <strong>Admin Response:</strong>
                    <div className={styles.responseText}>
                      {selectedMessage.adminResponse}
                    </div>
                    <div className={styles.responseInfo}>
                      Responded by {selectedMessage.respondedBy?.name} on{' '}
                      {selectedMessage.respondedAt && new Date(selectedMessage.respondedAt).toLocaleString()}
                    </div>
                  </div>
                )}
                <div className={styles.responseSection}>
                  <strong>Send Response:</strong>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response here..."
                    className={styles.responseTextarea}
                    rows={4}
                  />
                  <button
                    onClick={handleResponse}
                    disabled={isResponding || !responseText.trim()}
                    className={styles.sendResponseButton}
                  >
                    <FiSend />
                    {isResponding ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
