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
  countryDiscounts: {
    country: string;
    discountType: 'percentage' | 'fixed_amount' | 'waiver';
    discountValue: number;
    description: string;
  }[];
  paymentDeadlineDays: number;
  allowWaiverRequests: boolean;
  supportedPaymentMethods: string[];
  automaticWaiverCountries: string[];
}

const COUNTRY_NAMES: { [key: string]: string } = {
  'US': 'United States',
  'GB': 'United Kingdom', 
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IN': 'India',
  'CN': 'China',
  'JP': 'Japan',
  'BR': 'Brazil',
  'BD': 'Bangladesh',
  'AF': 'Afghanistan',
  'ET': 'Ethiopia',
  'NP': 'Nepal',
  'RW': 'Rwanda',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'GH': 'Ghana',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'PK': 'Pakistan',
  'LK': 'Sri Lanka',
  'MM': 'Myanmar',
  'KH': 'Cambodia',
  'LA': 'Laos'
};

const ARTICLE_TYPE_LABELS: { [key: string]: string } = {
  'research': 'Research Articles',
  'review': 'Review Articles', 
  'case-study': 'Case Studies',
  'editorial': 'Editorials',
  'letter': 'Letters to Editor',
  'brief-communication': 'Brief Communications'
};

const PAYMENT_METHOD_LABELS: { [key: string]: string } = {
  'stripe': 'Credit/Debit Cards (Stripe)',
  'paypal': 'PayPal',
  'bank_transfer': 'Bank Transfer',
  'waiver': 'Fee Waiver'
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
      
      const response = await fetch('/api/fee-config');
      if (response.ok) {
        const data = await response.json();
        if (data.feeConfig) {
          setFeeConfig(data.feeConfig);
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

  const getCountryName = (countryCode: string) => {
    return COUNTRY_NAMES[countryCode] || countryCode;
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
                This is the standard article processing charge. Fees may vary by article type and discounts may apply based on author location.
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
                  <strong>Waiver Requests</strong>
                  <p>{feeConfig.allowWaiverRequests ? 'Available' : 'Not Available'}</p>
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

        {/* Country-based Discounts */}
        {feeConfig.countryDiscounts.length > 0 && (
          <section className={styles.section}>
            <h2>Country-based Discounts and Waivers</h2>
            <p className={styles.sectionDescription}>
              We offer reduced fees or complete waivers for authors from certain countries to promote global research accessibility.
            </p>
            <div className={styles.discountTable}>
              <div className={styles.tableHeader}>
                <span>Country</span>
                <span>Discount Type</span>
                <span>Discount Amount</span>
                <span>Description</span>
              </div>
              {feeConfig.countryDiscounts.map((discount, index) => (
                <div key={index} className={styles.tableRow}>
                  <span className={styles.country}>
                    <FiGlobe className={styles.countryIcon} />
                    {getCountryName(discount.country)}
                  </span>
                  <span className={styles.discountType}>
                    {discount.discountType === 'waiver' && 'Full Waiver'}
                    {discount.discountType === 'percentage' && 'Percentage Discount'}
                    {discount.discountType === 'fixed_amount' && 'Fixed Amount Discount'}
                  </span>
                  <span className={styles.discountAmount}>
                    {discount.discountType === 'waiver' && '100%'}
                    {discount.discountType === 'percentage' && `${discount.discountValue}%`}
                    {discount.discountType === 'fixed_amount' && formatCurrency(discount.discountValue, feeConfig.currency)}
                  </span>
                  <span className={styles.description}>
                    {discount.description || 'No description provided'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Automatic Waivers */}
        {feeConfig.automaticWaiverCountries.length > 0 && (
          <section className={styles.section}>
            <h2>Automatic Fee Waivers</h2>
            <p className={styles.sectionDescription}>
              Authors from the following countries automatically receive full fee waivers:
            </p>
            <div className={styles.waiverCountries}>
              {feeConfig.automaticWaiverCountries.map((countryCode, index) => (
                <div key={index} className={styles.waiverCountry}>
                  <FiGlobe className={styles.countryIcon} />
                  {getCountryName(countryCode)}
                </div>
              ))}
            </div>
          </section>
        )}

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
            {feeConfig.allowWaiverRequests && (
              <div className={styles.infoItem}>
                <h3>Fee waiver requests</h3>
                <p>Authors who cannot afford the publication fee may request a waiver. Waiver requests are evaluated on a case-by-case basis.</p>
              </div>
            )}
            <div className={styles.infoItem}>
              <h3>Questions about fees?</h3>
              <p>If you have questions about publication fees, discounts, or payment options, please <a href="/contact">contact our editorial team</a>.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
