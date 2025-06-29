import { FiMail, FiPhone, FiMapPin, FiClock, FiSend } from 'react-icons/fi';
import styles from './Contact.module.scss';

export default function ContactPage() {
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

        {/* Contact Information */}
        <section className={styles.contactInfo}>
          <div className="container">
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <FiMail className={styles.contactIcon} />
                <h3>Email</h3>
                <p>info@researchjournal.com</p>
                <p>editorial@researchjournal.com</p>
              </div>
              
              <div className={styles.contactCard}>
                <FiPhone className={styles.contactIcon} />
                <h3>Phone</h3>
                <p>+1 (555) 123-4567</p>
                <p>+1 (555) 123-4568</p>
              </div>
              
              <div className={styles.contactCard}>
                <FiMapPin className={styles.contactIcon} />
                <h3>Address</h3>
                <p>123 Research Avenue</p>
                <p>Academic City, AC 12345</p>
              </div>
              
              <div className={styles.contactCard}>
                <FiClock className={styles.contactIcon} />
                <h3>Office Hours</h3>
                <p>Monday - Friday</p>
                <p>9:00 AM - 5:00 PM EST</p>
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
              
              <form className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>First Name *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Last Name *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email *</label>
                    <input
                      type="email"
                      className={styles.formInput}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <input
                      type="tel"
                      className={styles.formInput}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subject *</label>
                  <select className={styles.formSelect} required>
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
                    className={styles.formTextarea}
                    placeholder="Enter your message"
                    rows={6}
                    required
                  ></textarea>
                </div>

                <button type="submit" className={`${styles.submitButton} btn btn-primary btn-lg`}>
                  <FiSend />
                  Send Message
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
