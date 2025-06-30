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
  paymentDeadlineDays: number;
  isActive: boolean;
  requirePaymentBeforeProduction: boolean;
  supportedPaymentMethods: string[];
}

const ARTICLE_TYPES = [
  'research',
  'review', 
  'meta-analysis',
  'systematic-review',
  'case-study',
  'commentary',
  'editorial',
  'letter',
  'opinion',
  'perspective',
  'brief-communication',
  'methodology',
  'technical-note',
  'short-report'
];

const PAYMENT_METHODS = [
  'stripe',
  'paypal',
  'bank_transfer'
];

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

export default function FeeConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({
    name: 'default',
    description: 'Fixed APC fee structure based on article categories',
    baseFee: 2000,
    currency: 'USD',
    articleTypeFees: [
      { articleType: 'research', fee: 2000 },
      { articleType: 'review', fee: 1500 },
      { articleType: 'meta-analysis', fee: 1800 },
      { articleType: 'systematic-review', fee: 1600 },
      { articleType: 'case-study', fee: 1200 },
      { articleType: 'commentary', fee: 800 },
      { articleType: 'editorial', fee: 500 },
      { articleType: 'letter', fee: 400 },
      { articleType: 'opinion', fee: 600 },
      { articleType: 'perspective', fee: 700 },
      { articleType: 'brief-communication', fee: 500 },
      { articleType: 'methodology', fee: 1400 },
      { articleType: 'technical-note', fee: 900 },
      { articleType: 'short-report', fee: 800 }
    ],
    paymentDeadlineDays: 30,
    isActive: true,
    requirePaymentBeforeProduction: true,
    supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer']
  });

  // Sanitization function to remove any 'waiver' payment methods
  const sanitizeFeeConfig = (config: FeeConfig) => {
    // Ensure no 'waiver' payment methods are included
    const sanitizedConfig = {
      ...config,
      supportedPaymentMethods: config.supportedPaymentMethods.filter(method => method !== 'waiver')
    };
    
    // Ensure we have at least the basic payment methods
    const requiredMethods = ['stripe', 'paypal', 'bank_transfer'];
    for (const method of requiredMethods) {
      if (!sanitizedConfig.supportedPaymentMethods.includes(method)) {
        sanitizedConfig.supportedPaymentMethods.push(method);
      }
    }
    
    return sanitizedConfig;
  };

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
        if (data.config) {
          // Sanitize the config when loading it from the database
          const sanitizedConfig = sanitizeFeeConfig(data.config);
          setFeeConfig(sanitizedConfig);
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
      
      // Sanitize the config before saving
      const sanitizedConfig = sanitizeFeeConfig(feeConfig);
      
      const response = await fetch('/api/fee-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedConfig),
      });

      if (response.ok) {
        toast.success('Fee configuration saved successfully');
        // Update local state with sanitized version
        setFeeConfig(sanitizedConfig);
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

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset to default configuration? This will overwrite all current settings.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/fee-config/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        toast.success('Configuration reset to defaults successfully');
        await fetchFeeConfig();
      } else {
        toast.error('Failed to reset configuration');
      }
    } catch (error) {
      console.error('Error resetting fee config:', error);
      toast.error('Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const addArticleTypeFee = () => {
    const newArticleTypes = ARTICLE_TYPES.filter(type => 
      !feeConfig.articleTypeFees.some(fee => fee.articleType === type)
    );
    
    if (newArticleTypes.length > 0) {
      setFeeConfig({
        ...feeConfig,
        articleTypeFees: [
          ...feeConfig.articleTypeFees,
          { articleType: newArticleTypes[0], fee: feeConfig.baseFee }
        ]
      });
    }
  };

  const removeArticleTypeFee = (index: number) => {
    setFeeConfig({
      ...feeConfig,
      articleTypeFees: feeConfig.articleTypeFees.filter((_, i) => i !== index)
    });
  };

  const updateArticleTypeFee = (index: number, field: string, value: any) => {
    const newFees = [...feeConfig.articleTypeFees];
    newFees[index] = { ...newFees[index], [field]: value };
    setFeeConfig({ ...feeConfig, articleTypeFees: newFees });
  };

  const cleanupWaiverMethods = async () => {
    if (!confirm('This will remove any old "waiver" payment methods from the configuration. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/fee-config/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updatedConfigs > 0) {
          toast.success(`Cleanup completed. Updated ${data.updatedConfigs} configuration(s).`);
        } else {
          toast.success('No cleanup needed. Configuration is already clean.');
        }
        await fetchFeeConfig();
      } else {
        toast.error('Failed to run cleanup');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading fee configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Fee Configuration</h1>
        <p>Manage article processing charges and payment settings</p>
      </div>

      <div className={styles.configForm}>
        {/* Basic Configuration */}
        <section className={styles.section}>
          <h2>Basic Configuration</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Configuration Name</label>
              <input
                type="text"
                value={feeConfig.name}
                onChange={(e) => setFeeConfig({ ...feeConfig, name: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Description</label>
              <input
                type="text"
                value={feeConfig.description}
                onChange={(e) => setFeeConfig({ ...feeConfig, description: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Base Fee</label>
              <input
                type="number"
                value={feeConfig.baseFee}
                onChange={(e) => setFeeConfig({ ...feeConfig, baseFee: Number(e.target.value) })}
                min="0"
                step="50"
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
                max="90"
              />
            </div>
          </div>
        </section>

        {/* Article Type Fees */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Article Type Fees</h2>
            <button 
              onClick={addArticleTypeFee}
              className="btn btn-secondary"
              disabled={feeConfig.articleTypeFees.length >= ARTICLE_TYPES.length}
            >
              Add Article Type
            </button>
          </div>
          
          <div className={styles.feeTable}>
            {feeConfig.articleTypeFees.map((articleFee, index) => (
              <div key={index} className={styles.feeRow}>
                <select
                  value={articleFee.articleType}
                  onChange={(e) => updateArticleTypeFee(index, 'articleType', e.target.value)}
                >
                  {ARTICLE_TYPES.map(type => (
                    <option key={type} value={type}>
                      {ARTICLE_TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  value={articleFee.fee}
                  onChange={(e) => updateArticleTypeFee(index, 'fee', Number(e.target.value))}
                  min="0"
                  step="50"
                  placeholder="Fee amount"
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

        {/* Payment Settings */}
        <section className={styles.section}>
          <h2>Payment Settings</h2>
          
          <div className={styles.formGroup}>
            <label>Supported Payment Methods</label>
            <div className={styles.checkboxGrid}>
              {PAYMENT_METHODS.map(method => (
                <label key={method} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={feeConfig.supportedPaymentMethods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFeeConfig({
                          ...feeConfig,
                          supportedPaymentMethods: [...feeConfig.supportedPaymentMethods, method]
                        });
                      } else {
                        setFeeConfig({
                          ...feeConfig,
                          supportedPaymentMethods: feeConfig.supportedPaymentMethods.filter(m => m !== method)
                        });
                      }
                    }}
                  />
                  {PAYMENT_METHOD_LABELS[method] || method}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.checkboxGrid}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={feeConfig.requirePaymentBeforeProduction}
                onChange={(e) => setFeeConfig({ ...feeConfig, requirePaymentBeforeProduction: e.target.checked })}
              />
              Require payment before production
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={feeConfig.isActive}
                onChange={(e) => setFeeConfig({ ...feeConfig, isActive: e.target.checked })}
              />
              Configuration is active
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            onClick={saveFeeConfig}
            disabled={saving}
            className={`${styles.btn} btn-primary`}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className={`${styles.btn} btn-secondary`}
          >
            Reset to Defaults
          </button>

          <button
            onClick={cleanupWaiverMethods}
            disabled={saving}
            className={`${styles.btn} btn-secondary`}
            title="Remove old waiver payment methods from configuration"
          >
            Cleanup Old Data
          </button>
        </div>
      </div>
    </div>
  );
}
