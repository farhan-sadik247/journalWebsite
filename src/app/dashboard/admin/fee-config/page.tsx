'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import styles from './FeeConfig.module.scss';

interface FeeConfig {
  _id?: string;
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
  isActive: boolean;
  allowWaiverRequests: boolean;
  requirePaymentBeforeProduction: boolean;
  supportedPaymentMethods: string[];
  automaticWaiverCountries: string[];
}

const ARTICLE_TYPES = [
  'research',
  'review',
  'case-study',
  'editorial',
  'letter',
  'brief-communication'
];

const PAYMENT_METHODS = [
  'stripe',
  'paypal',
  'bank_transfer',
  'waiver'
];

const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'NP', name: 'Nepal' },
  { code: 'RW', name: 'Rwanda' }
];

export default function FeeConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({
    name: 'default',
    description: 'Default APC fee structure',
    baseFee: 2000,
    currency: 'USD',
    articleTypeFees: [
      { articleType: 'research', fee: 2000 },
      { articleType: 'review', fee: 1500 },
      { articleType: 'case-study', fee: 1200 },
      { articleType: 'editorial', fee: 0 },
      { articleType: 'letter', fee: 500 }
    ],
    countryDiscounts: [],
    paymentDeadlineDays: 30,
    isActive: true,
    allowWaiverRequests: true,
    requirePaymentBeforeProduction: true,
    supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer'],
    automaticWaiverCountries: []
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session && !session.user.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }

    if (session) {
      fetchFeeConfig();
    }
  }, [session, status, router]);

  const fetchFeeConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fee-config');
      if (response.ok) {
        const data = await response.json();
        if (data.feeConfig) {
          setFeeConfig(data.feeConfig);
        }
      } else {
        console.error('Failed to fetch fee config');
      }
    } catch (error) {
      console.error('Error fetching fee config:', error);
      toast.error('Failed to load fee configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveFeeConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/fee-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeConfig),
      });

      if (response.ok) {
        toast.success('Fee configuration saved successfully');
      } else {
        toast.error('Failed to save fee configuration');
      }
    } catch (error) {
      console.error('Error saving fee config:', error);
      toast.error('Failed to save fee configuration');
    } finally {
      setSaving(false);
    }
  };

  const addArticleTypeFee = () => {
    setFeeConfig({
      ...feeConfig,
      articleTypeFees: [
        ...feeConfig.articleTypeFees,
        { articleType: 'research', fee: feeConfig.baseFee }
      ]
    });
  };

  const removeArticleTypeFee = (index: number) => {
    setFeeConfig({
      ...feeConfig,
      articleTypeFees: feeConfig.articleTypeFees.filter((_, i) => i !== index)
    });
  };

  const addCountryDiscount = () => {
    setFeeConfig({
      ...feeConfig,
      countryDiscounts: [
        ...feeConfig.countryDiscounts,
        { country: 'US', discountType: 'percentage', discountValue: 0, description: '' }
      ]
    });
  };

  const removeCountryDiscount = (index: number) => {
    setFeeConfig({
      ...feeConfig,
      countryDiscounts: feeConfig.countryDiscounts.filter((_, i) => i !== index)
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user.roles?.includes('admin')) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Publication Fee Configuration</h1>
        <p>Configure Article Processing Charges (APC) and payment settings</p>
      </div>

      <div className={styles.configForm}>
        {/* Basic Settings */}
        <section className={styles.section}>
          <h2>Basic Settings</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Configuration Name</label>
              <input
                type="text"
                value={feeConfig.name}
                onChange={(e) => setFeeConfig({ ...feeConfig, name: e.target.value })}
                placeholder="e.g., default"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <input
                type="text"
                value={feeConfig.description}
                onChange={(e) => setFeeConfig({ ...feeConfig, description: e.target.value })}
                placeholder="e.g., Default APC fee structure"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Base Fee</label>
              <input
                type="number"
                value={feeConfig.baseFee}
                onChange={(e) => setFeeConfig({ ...feeConfig, baseFee: Number(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Currency</label>
              <select
                value={feeConfig.currency}
                onChange={(e) => setFeeConfig({ ...feeConfig, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Payment Deadline (Days)</label>
              <input
                type="number"
                value={feeConfig.paymentDeadlineDays}
                onChange={(e) => setFeeConfig({ ...feeConfig, paymentDeadlineDays: Number(e.target.value) })}
                min="1"
              />
            </div>
          </div>
        </section>

        {/* Article Type Fees */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Article Type Fees</h2>
            <button onClick={addArticleTypeFee} className="btn btn-secondary">
              Add Article Type
            </button>
          </div>
          <div className={styles.feeTable}>
            {feeConfig.articleTypeFees.map((articleFee, index) => (
              <div key={index} className={styles.feeRow}>
                <select
                  value={articleFee.articleType}
                  onChange={(e) => {
                    const newFees = [...feeConfig.articleTypeFees];
                    newFees[index].articleType = e.target.value;
                    setFeeConfig({ ...feeConfig, articleTypeFees: newFees });
                  }}
                >
                  {ARTICLE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={articleFee.fee}
                  onChange={(e) => {
                    const newFees = [...feeConfig.articleTypeFees];
                    newFees[index].fee = Number(e.target.value);
                    setFeeConfig({ ...feeConfig, articleTypeFees: newFees });
                  }}
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={() => removeArticleTypeFee(index)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Country Discounts */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Country-based Discounts</h2>
            <button onClick={addCountryDiscount} className="btn btn-secondary">
              Add Country Discount
            </button>
          </div>
          <div className={styles.discountTable}>
            {feeConfig.countryDiscounts.map((discount, index) => (
              <div key={index} className={styles.discountRow}>
                <select
                  value={discount.country}
                  onChange={(e) => {
                    const newDiscounts = [...feeConfig.countryDiscounts];
                    newDiscounts[index].country = e.target.value;
                    setFeeConfig({ ...feeConfig, countryDiscounts: newDiscounts });
                  }}
                >
                  {COMMON_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
                <select
                  value={discount.discountType}
                  onChange={(e) => {
                    const newDiscounts = [...feeConfig.countryDiscounts];
                    newDiscounts[index].discountType = e.target.value as any;
                    setFeeConfig({ ...feeConfig, countryDiscounts: newDiscounts });
                  }}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                  <option value="waiver">Full Waiver</option>
                </select>
                <input
                  type="number"
                  value={discount.discountValue}
                  onChange={(e) => {
                    const newDiscounts = [...feeConfig.countryDiscounts];
                    newDiscounts[index].discountValue = Number(e.target.value);
                    setFeeConfig({ ...feeConfig, countryDiscounts: newDiscounts });
                  }}
                  min="0"
                  step="0.01"
                  disabled={discount.discountType === 'waiver'}
                  placeholder={discount.discountType === 'percentage' ? '% off' : 'Amount off'}
                />
                <input
                  type="text"
                  value={discount.description}
                  onChange={(e) => {
                    const newDiscounts = [...feeConfig.countryDiscounts];
                    newDiscounts[index].description = e.target.value;
                    setFeeConfig({ ...feeConfig, countryDiscounts: newDiscounts });
                  }}
                  placeholder="Description"
                />
                <button
                  onClick={() => removeCountryDiscount(index)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className={styles.section}>
          <h2>Additional Settings</h2>
          <div className={styles.checkboxGrid}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={feeConfig.isActive}
                onChange={(e) => setFeeConfig({ ...feeConfig, isActive: e.target.checked })}
              />
              Active Configuration
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={feeConfig.allowWaiverRequests}
                onChange={(e) => setFeeConfig({ ...feeConfig, allowWaiverRequests: e.target.checked })}
              />
              Allow Waiver Requests
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={feeConfig.requirePaymentBeforeProduction}
                onChange={(e) => setFeeConfig({ ...feeConfig, requirePaymentBeforeProduction: e.target.checked })}
              />
              Require Payment Before Production
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            onClick={saveFeeConfig}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
