'use client';

import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiClock, FiSend } from 'react-icons/fi';
import styles from './Contact.module.scss';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you for your message! We will get back to you soon.'
        });
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className={styles.contactPage}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroContent}>
              <h1>Contact Us</h1>
              <p className={styles.heroSubtitle}>
                Get in touch with our editorial team and support staff
              </p>
              <div className={styles.heroDescription}>
                <p>
                  Whether you have questions about submitting a manuscript, need assistance 
                  with the peer review process, or want to discuss partnership opportunities, 
                  we&apos;re here to help.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className={styles.contactForm}>
          <div className="container">
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h2>Send us a Message</h2>
                <p>Fill out the form below and we&apos;ll get back to you as soon as possible.</p>
              </div>
              
              <form className={styles.form} onSubmit={handleSubmit}>
                {submitStatus.type && (
                  <div className={`${styles.alert} ${styles[submitStatus.type]}`}>
                    {submitStatus.message}
                  </div>
                )}
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="Enter your first name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="Enter your last name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="Enter your phone number"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subject *</label>
                  <select 
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={styles.formSelect} 
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a subject</option>
                    <option value="submission">Manuscript Submission</option>
                    <option value="review">Peer Review Process</option>
                    <option value="editorial">Editorial Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    placeholder="Enter your message"
                    rows={6}
                    required
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className={`${styles.submitButton} btn btn-primary btn-lg`}
                  disabled={isSubmitting}
                >
                  <FiSend />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faq}>
          <div className="container">
            <h2>Frequently Asked Questions</h2>
            <div className={styles.faqGrid}>
              <div className={styles.faqItem}>
                <h3>How do I submit a manuscript?</h3>
                <p>
                  You can submit your manuscript through our online submission system. 
                  Create an account, fill out the submission form, and upload your files. 
                  Our editorial team will review your submission promptly.
                </p>
              </div>
              
              <div className={styles.faqItem}>
                <h3>What is the typical review time?</h3>
                <p>
                  The initial editorial review typically takes 1-2 weeks. If your manuscript 
                  is sent for peer review, the entire process usually takes 8-12 weeks, 
                  depending on reviewer availability and manuscript complexity.
                </p>
              </div>
              
              <div className={styles.faqItem}>
                <h3>Do you charge publication fees?</h3>
                <p>
                  We offer both traditional subscription-based and open access publishing 
                  models. Open access articles have an article processing charge, while 
                  subscription articles do not. Fee waivers are available for authors 
                  from developing countries.
                </p>
              </div>
              
              <div className={styles.faqItem}>
                <h3>How can I become a reviewer?</h3>
                <p>
                  We welcome qualified researchers to join our reviewer pool. You can 
                  create a reviewer profile in our system, providing details about your 
                  expertise and research interests. Our editors will invite you to review 
                  manuscripts that match your expertise.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
