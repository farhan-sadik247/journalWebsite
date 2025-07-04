'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiCreditCard, FiDollarSign, FiInfo, FiSave, FiArrowLeft } from 'react-icons/fi';
import styles from './BankConfig.module.scss';

interface BankConfig {
  payableAmount: number;
  bankName: string;
  accountNumber: string;
  accountDetails: string;
  currency: string;
}

export default function BankConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<BankConfig>({
    payableAmount: 0,
    bankName: '',
    accountNumber: '',
    accountDetails: '',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check admin access
    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchBankConfig();
  }, [session, status, router]);

  const fetchBankConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bank-config');
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        console.error('Failed to load bank configuration');
      }
    } catch (error) {
      console.error('Error fetching bank config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BankConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!config.payableAmount || !config.bankName || !config.accountNumber || !config.accountDetails) {
      alert('All fields are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/bank-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Bank configuration updated successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update bank configuration');
      }
    } catch (error) {
      console.error('Error saving bank config:', error);
      alert('Failed to save bank configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading bank configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard/admin')}
        >
          <FiArrowLeft />
          Back to Admin Dashboard
        </button>
        
        <div className={styles.headerContent}>
          <FiCreditCard className={styles.headerIcon} />
          <div>
            <h1>Bank Configuration</h1>
            <p>Configure bank details for manual payment processing</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.configCard}>
          <div className={styles.cardHeader}>
            <FiCreditCard className={styles.cardIcon} />
            <h2>Payment Details</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="payableAmount">
                <FiDollarSign className={styles.labelIcon} />
                Payable Amount
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.currency}>{config.currency}</span>
                <input
                  id="payableAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.payableAmount}
                  onChange={(e) => handleInputChange('payableAmount', parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                value={config.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="BDT">BDT</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankName">
                <FiCreditCard className={styles.labelIcon} />
                Bank Name
              </label>
              <input
                id="bankName"
                type="text"
                value={config.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="Enter bank name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="accountNumber">Account Number</label>
              <input
                id="accountNumber"
                type="text"
                value={config.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                placeholder="Enter account number"
              />
            </div>

            <div className={styles.formGroup + ' ' + styles.fullWidth}>
              <label htmlFor="accountDetails">
                <FiInfo className={styles.labelIcon} />
                Bank Account Details
              </label>
              <textarea
                id="accountDetails"
                value={config.accountDetails}
                onChange={(e) => handleInputChange('accountDetails', e.target.value)}
                placeholder="Enter additional bank details (routing number, SWIFT code, etc.)"
                rows={4}
              />
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className={styles.spinner}></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <FiInfo className={styles.cardIcon} />
            <h3>Information</h3>
          </div>
          <div className={styles.infoContent}>
            <p>
              <strong>Payment Process:</strong> When authors submit their accepted manuscripts, 
              they will see these bank details and be required to make a manual payment of the 
              specified amount.
            </p>
            <p>
              <strong>Verification:</strong> Authors will submit their payment information 
              (account holder name, amount, transaction ID) which will be reviewed by editors 
              for verification.
            </p>
            <p>
              <strong>Note:</strong> Make sure all bank details are accurate as they will be 
              displayed to authors for payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
