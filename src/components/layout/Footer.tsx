import Link from 'next/link';
import { FiMail, FiPhone, FiMapPin, FiTwitter, FiFacebook, FiLinkedin } from 'react-icons/fi';
import styles from './Footer.module.scss';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    journal: [
      { name: 'About', href: '/about' },
      { name: 'Aims & Scope', href: '/about' },
      { name: 'Editorial Board', href: '/editorial-board' },
      { name: 'Publication Ethics', href: '/about' },
    ],
    authors: [
      { name: 'Submit Manuscript', href: '/submit' },
      { name: 'Author Guidelines', href: '/author-guidelines' },
      { name: 'Review Process', href: '/review-process' },
      { name: 'Open Access', href: '/' },
    ],
    resources: [
      { name: 'Browse Articles', href: '/articles' },
      { name: 'Current Issue', href: '/articles' },
      { name: 'Archives', href: '/archives' },
      { name: 'Special Issues', href: '/articles' },
    ],
    support: [
      { name: 'Contact Us', href: '/contact' },
      { name: 'User Manual', href: '/user-manual' },
      { name: 'FAQ', href: '/contact' },
      { name: 'Privacy Policy', href: '/about' },
      { name: 'Terms of Service', href: '/about' },
    ],
  };

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Main Footer Content */}
        <div className={styles.footerContent}>
          {/* Journal Info */}
          <div className={styles.journalInfo}>
            <h3>Global Journal of Advanced Technology</h3>
            <p>
              Innovating the Future, One Breakthrough at a Time. A premier platform for publishing 
              cutting-edge research in advanced technology and engineering.
            </p>           
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
            <p>&copy; {currentYear} Global Journal of Advanced Technology (GJADT). All rights reserved.</p>
          </div>
          <div className={styles.legalLinks}>
            <Link href="/about">Privacy Policy</Link>
            <Link href="/about">Terms of Service</Link>
            <Link href="/about">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
