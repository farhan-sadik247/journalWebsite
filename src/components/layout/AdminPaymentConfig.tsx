'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiDollarSign, FiChevronDown, FiEdit, FiExternalLink } from 'react-icons/fi';
import Link from 'next/link';
import styles from './AdminPaymentConfig.module.scss';

interface FeeConfig {
  _id: string;
  name: string;
  description: string;
  baseFee: number;
  currency: string;
  articleTypeFees: {
    articleType: string;
    fee: number;
  }[];
  paymentDeadlineDays: number;
  supportedPaymentMethods: string[];
  requirePaymentBeforeProduction: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminPaymentConfig = () => {
  const { data: session } = useSession();
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingBaseFee, setEditingBaseFee] = useState<number | null>(null);

  const fetchFeeConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fee-config');
      if (response.ok) {
        const data = await response.json();
        setFeeConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching fee config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBaseFee = async (newBaseFee: number) => {
    if (!feeConfig) return;
    
    try {
      const response = await fetch('/api/fee-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feeConfig,
          baseFee: newBaseFee
        })
      });

      if (response.ok) {
        await fetchFeeConfig();
        setEditingBaseFee(null);
      }
    } catch (error) {
      console.error('Error updating base fee:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  useEffect(() => {
    if (session?.user?.role === 'admin' && isOpen) {
      fetchFeeConfig();
    }
  }, [session, isOpen]);

  // Only show for admins
  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className={styles.paymentConfigContainer}>
      <button
        className={styles.paymentConfigButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Payment Configuration"
      >
        <FiDollarSign />
        <span>Payment Config</span>
        <FiChevronDown className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.paymentConfigDropdown}>
          <div className={styles.configHeader}>
            <h3>Fee Configuration Quick View</h3>
          </div>

          <div className={styles.configList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : !feeConfig ? (
              <div className={styles.empty}>No fee configuration found</div>
            ) : (
              <div className={styles.configContent}>
                {/* Base Fee Section */}
                <div className={styles.configSection}>
                  <div className={styles.sectionHeader}>
                    <h4>Base Fee</h4>
                    <button
                      onClick={() => setEditingBaseFee(feeConfig.baseFee)}
                      className={styles.editButton}
                      title="Edit base fee"
                    >
                      <FiEdit />
                    </button>
                  </div>
                  
                  {editingBaseFee !== null ? (
                    <div className={styles.editForm}>
                      <div className={styles.inputGroup}>
                        <input
                          type="number"
                          step="0.01"
                          value={editingBaseFee}
                          onChange={(e) => setEditingBaseFee(parseFloat(e.target.value) || 0)}
                          className={styles.editInput}
                          placeholder="Base fee amount"
                        />
                        <span className={styles.currency}>{feeConfig.currency}</span>
                      </div>
                      <div className={styles.editActions}>
                        <button
                          onClick={() => updateBaseFee(editingBaseFee)}
                          className={styles.saveButton}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingBaseFee(null)}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.configValue}>
                      {formatCurrency(feeConfig.baseFee, feeConfig.currency)}
                    </div>
                  )}
                </div>

                {/* Article Type Fees Summary */}
                <div className={styles.configSection}>
                  <h4>Article Type Fees</h4>
                  <div className={styles.feeList}>
                    {feeConfig.articleTypeFees.slice(0, 3).map((articleFee, index) => (
                      <div key={index} className={styles.feeItem}>
                        <span className={styles.feeType}>
                          {articleFee.articleType.charAt(0).toUpperCase() + articleFee.articleType.slice(1)}
                        </span>
                        <span className={styles.feeAmount}>
                          {articleFee.fee === 0 ? 'Free' : formatCurrency(articleFee.fee, feeConfig.currency)}
                        </span>
                      </div>
                    ))}
                    {feeConfig.articleTypeFees.length > 3 && (
                      <div className={styles.moreItems}>
                        +{feeConfig.articleTypeFees.length - 3} more types
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Info */}
                <div className={styles.configSection}>
                  <h4>Configuration Details</h4>
                  <div className={styles.configDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Name:</span>
                      <span className={styles.detailValue}>{feeConfig.name}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Payment Deadline:</span>
                      <span className={styles.detailValue}>{feeConfig.paymentDeadlineDays} days</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Payment Methods:</span>
                      <span className={styles.detailValue}>{feeConfig.supportedPaymentMethods.length} supported</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status:</span>
                      <span className={styles.detailValue}>
                        {feeConfig.isActive ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.configFooter}>
            <Link href="/dashboard/admin/fee-config" className={styles.manageLink}>
              <FiExternalLink className={styles.linkIcon} />
              Manage Full Configuration
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentConfig;
