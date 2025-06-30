'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiInfo, FiGlobe, FiFileText, FiCalendar, FiCreditCard } from 'react-icons/fi';
import styles from './PublicationFees.module.scss';

interface FeeConfig {
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
}

const ARTICLE_TYPE_LABELS: { [key: string]: string } = {
  'research': 'Research Articles',
  'review': 'Review Articles', 
  'meta-analysis': 'Meta-Analysis',
  'systematic-review': 'Systematic Review',
  'case-study': 'Case Studies',
  'commentary': 'Commentary',
  'editorial': 'Editorials',
  'letter': 'Letters to Editor',
  'opinion': 'Opinion Articles',
  'perspective': 'Perspective',
  'brief-communication': 'Brief Communications',
  'methodology': 'Methodology',
  'technical-note': 'Technical Notes',
  'short-report': 'Short Reports'
};

const PAYMENT_METHOD_LABELS: { [key: string]: string } = {
  'stripe': 'Credit/Debit Cards (Stripe)',
  'paypal': 'PayPal',
  'bank_transfer': 'Bank Transfer'
};

export default function PublicationFeesPage() {
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeeConfig();
  }, []);

  const fetchFeeConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/fee-config/public');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setFeeConfig(data.config);
        } else {
          setError('Fee configuration not available');
        }
      } else {
        setError('Failed to load fee information');
      }
    } catch (err) {
      console.error('Error fetching fee config:', err);
      setError('Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getArticleTypeLabel = (type: string) => {
    return ARTICLE_TYPE_LABELS[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHOD_LABELS[method] || method;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading publication fee information...</p>
        </div>
      </div>
    );
  }

  if (error || !feeConfig) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <FiInfo className={styles.errorIcon} />
          <h2>Fee Information Unavailable</h2>
          <p>{error || 'Publication fee information is currently not available.'}</p>
          <button onClick={fetchFeeConfig} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <FiDollarSign className={styles.headerIcon} />
          <div>
            <h1>Publication Fees</h1>
            <p>Article Processing Charges (APC) and Payment Information</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        
        {/* Overview */}
        <section className={styles.section}>
          <h2>Overview</h2>
          <div className={styles.overviewCard}>
            <p>{feeConfig.description}</p>
            <div className={styles.baseFeeInfo}>
              <h3>Base Publication Fee</h3>
              <div className={styles.baseFeeAmount}>
                <span className={styles.currency}>{feeConfig.currency}</span>
                <span className={styles.amount}>{feeConfig.baseFee.toFixed(2)}</span>
              </div>
              <p className={styles.baseFeeNote}>
                This is the standard article processing charge. Final fees are determined by article type with transparent, fixed pricing for all authors globally.
              </p>
            </div>
            <div className={styles.keyInfo}>
              <div className={styles.infoItem}>
                <FiCalendar className={styles.infoIcon} />
                <div>
                  <strong>Payment Deadline</strong>
                  <p>{feeConfig.paymentDeadlineDays} days after acceptance</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FiCreditCard className={styles.infoIcon} />
                <div>
                  <strong>Currency</strong>
                  <p>{feeConfig.currency}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FiFileText className={styles.infoIcon} />
                <div>
                  <strong>Pricing Model</strong>
                  <p>Fixed fees by article type</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Article Type Fees */}
        <section className={styles.section}>
          <h2>Fees by Article Type</h2>
          <div className={styles.feeTable}>
            <div className={styles.tableHeader}>
              <span>Article Type</span>
              <span>Fee ({feeConfig.currency})</span>
            </div>
            {feeConfig.articleTypeFees.map((articleFee, index) => (
              <div key={index} className={styles.tableRow}>
                <span className={styles.articleType}>
                  {getArticleTypeLabel(articleFee.articleType)}
                </span>
                <span className={styles.fee}>
                  {articleFee.fee === 0 ? 'Free' : formatCurrency(articleFee.fee, feeConfig.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Methods */}
        <section className={styles.section}>
          <h2>Accepted Payment Methods</h2>
          <div className={styles.paymentMethods}>
            {feeConfig.supportedPaymentMethods.map((method, index) => (
              <div key={index} className={styles.paymentMethod}>
                <FiCreditCard className={styles.paymentIcon} />
                <span>{getPaymentMethodLabel(method)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Information */}
        <section className={styles.section}>
          <h2>Important Information</h2>
          <div className={styles.infoBox}>
            <div className={styles.infoItem}>
              <h3>When are fees charged?</h3>
              <p>Publication fees are only charged after your manuscript has been accepted for publication following peer review.</p>
            </div>
            <div className={styles.infoItem}>
              <h3>Payment deadline</h3>
              <p>Authors have {feeConfig.paymentDeadlineDays} days from the acceptance notification to complete payment. Extensions may be available upon request.</p>
            </div>
            <div className={styles.infoItem}>
              <h3>Transparent pricing</h3>
              <p>Our journal uses a fixed fee structure based solely on article type. All authors pay the same rate for each category, ensuring fairness and transparency in our publication process.</p>
            </div>
            <div className={styles.infoItem}>
              <h3>Questions about fees?</h3>
              <p>If you have questions about publication fees or payment options, please <a href="/contact">contact our editorial team</a>.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
