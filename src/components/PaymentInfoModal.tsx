'use client';

import { useState } from 'react';
import { FiUser, FiDollarSign, FiHash, FiSend, FiX } from 'react-icons/fi';
import styles from './PaymentInfoModal.module.scss';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  manuscriptId: string;
  onSubmit: (data: { accountHolderName: string; amount: number; transactionId: string }) => Promise<void>;
}

export default function PaymentInfoModal({ 
  isOpen, 
  onClose, 
  amount, 
  manuscriptId, 
  onSubmit 
}: PaymentInfoModalProps) {
  console.log('🔵 PaymentInfoModal rendered with props:', { 
    isOpen, 
    amount, 
    manuscriptId,
    timestamp: new Date().toISOString()
  });
  
  const [formData, setFormData] = useState({
    accountHolderName: '',
    transactionId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (!formData.accountHolderName.trim() || !formData.transactionId.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Calling onSubmit with:', {
        accountHolderName: formData.accountHolderName,
        amount,
        transactionId: formData.transactionId,
      });
      
      await onSubmit({
        accountHolderName: formData.accountHolderName,
        amount,
        transactionId: formData.transactionId,
      });
      
      console.log('onSubmit completed successfully');
      
      // Reset form and close modal
      setFormData({
        accountHolderName: '',
        transactionId: '',
      });
      
      console.log('Closing modal after successful submission');
      onClose();
    } catch (error) {
      console.error('Error submitting payment info:', error);
      alert(`Error submitting payment: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    console.log('Modal is not open, returning null');
    return null;
  }

  console.log('Rendering PaymentInfoModal content, isOpen:', isOpen);
  
  // Render the modal
  return (
    <>
      {/* Debug info overlay */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'blue',
        color: 'white',
        padding: '15px',
        zIndex: 10001,
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'monospace',
        border: '2px solid white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        minWidth: '300px'
      }}>
        🔵 MODAL COMPONENT DEBUG:<br/>
        isOpen: <strong>{isOpen.toString()}</strong><br/>
        amount: <strong>{amount}</strong><br/>
        manuscriptId: <strong>{manuscriptId}</strong><br/>
        Component Rendered: <strong>✅ YES</strong><br/>
        Timestamp: <strong>{new Date().toLocaleTimeString()}</strong>
      </div>
      
      {/* Modal with inline styles for testing */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={onClose}
      >
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className={styles.modalHeader}>
          <h3>
            <FiDollarSign />
            {manuscriptId.includes('rejected') ? 'Resubmit Payment Information' : 'Payment Information'}
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: manuscriptId.includes('rejected') ? '#fef2f2' : '#f0f9ff', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: manuscriptId.includes('rejected') ? '#dc2626' : '#1e40af' }}>
              {manuscriptId.includes('rejected') ? 
                'Your previous payment was rejected. Please resubmit your payment details after completing a new bank transfer.' :
                'Please provide your payment details after completing the bank transfer.'}
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="accountHolderName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              <FiUser style={{ marginRight: '0.5rem' }} />
              Account Holder Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="accountHolderName"
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
              placeholder="Enter the name on the bank account"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="amount" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              <FiDollarSign style={{ marginRight: '0.5rem' }} />
              Amount
            </label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.75rem', 
              backgroundColor: '#f3f4f6', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px' 
            }}>
              <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>USD</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>${amount.toFixed(2)}</span>
            </div>
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              This amount was automatically fetched from the database
            </small>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="transactionId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              <FiHash style={{ marginRight: '0.5rem' }} />
              Transaction ID <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="transactionId"
              type="text"
              value={formData.transactionId}
              onChange={(e) => handleInputChange('transactionId', e.target.value)}
              placeholder="Enter your bank transaction reference ID"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Please provide the transaction ID/reference number from your bank transfer
            </small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.accountHolderName.trim() || !formData.transactionId.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                background: submitting || !formData.accountHolderName.trim() || !formData.transactionId.trim() ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: submitting || !formData.accountHolderName.trim() || !formData.transactionId.trim() ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {submitting ? (
                <>
                  <div style={{ 
                    width: '1rem', 
                    height: '1rem', 
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Sending...
                </>
              ) : (
                <>
                  <FiSend />
                  Send Information
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
