import Link from 'next/link';
import { FiMail, FiPhone, FiMapPin, FiTwitter, FiFacebook, FiLinkedin } from 'react-icons/fi';
import styles from './Footer.module.scss';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    journal: [
      { name: 'About', href: '/about' },
      { name: 'Aims & Scope', href: '/aims-scope' },
      { name: 'Editorial Board', href: '/editorial-board' },
      { name: 'Publication Ethics', href: '/publication-ethics' },
    ],
    authors: [
      { name: 'Submit Manuscript', href: '/submit' },
      { name: 'Author Guidelines', href: '/author-guidelines' },
      { name: 'Review Process', href: '/review-process' },
      { name: 'Open Access', href: '/open-access' },
    ],
    resources: [
      { name: 'Browse Articles', href: '/articles' },
      { name: 'Current Issue', href: '/current-issue' },
      { name: 'Archives', href: '/archives' },
      { name: 'Special Issues', href: '/special-issues' },
    ],
    support: [
      { name: 'Contact Us', href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Main Footer Content */}
        <div className={styles.footerContent}>
          {/* Journal Info */}
          <div className={styles.journalInfo}>
            <h3>ResearchJournal</h3>
            <p>
              A leading platform for academic research publication and peer review, 
              dedicated to advancing knowledge across all scientific disciplines.
            </p>
            
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <FiMail />
                <span>editor@researchjournal.com</span>
              </div>
              <div className={styles.contactItem}>
                <FiPhone />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className={styles.contactItem}>
                <FiMapPin />
                <span>123 Academic Street, Research City, RC 12345</span>
              </div>
            </div>

            <div className={styles.socialLinks}>
              <a href="#" aria-label="Twitter">
                <FiTwitter />
              </a>
              <a href="#" aria-label="Facebook">
                <FiFacebook />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FiLinkedin />
              </a>
            </div>
          </div>

          {/* Footer Links */}
          <div className={styles.linkColumns}>
            <div className={styles.linkColumn}>
              <h4>Journal</h4>
              {footerLinks.journal.map((link) => (
                <Link key={link.name} href={link.href}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkColumn}>
              <h4>For Authors</h4>
              {footerLinks.authors.map((link) => (
                <Link key={link.name} href={link.href}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkColumn}>
              <h4>Resources</h4>
              {footerLinks.resources.map((link) => (
                <Link key={link.name} href={link.href}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkColumn}>
              <h4>Support</h4>
              {footerLinks.support.map((link) => (
                <Link key={link.name} href={link.href}>
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className={styles.footerBottom}>
          <div className={styles.copyright}>
            <p>&copy; {currentYear} ResearchJournal. All rights reserved.</p>
          </div>
          <div className={styles.legalLinks}>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
