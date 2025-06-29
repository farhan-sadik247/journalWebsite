import Link from 'next/link';
import { FiArrowRight, FiBookOpen, FiUsers, FiAward } from 'react-icons/fi';
import styles from './HeroSection.module.scss';

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1>
              Advancing Scientific Knowledge Through 
              <span className={styles.highlight}> Peer-Reviewed Research</span>
            </h1>
            <p>
              Join the leading platform for academic research publication. Submit your manuscripts, 
              engage in rigorous peer review, and contribute to the global scientific community.
            </p>
            
            <div className={styles.heroActions}>
              <Link href="/submit" className="btn btn-primary btn-lg">
                <FiBookOpen />
                Submit Manuscript
                <FiArrowRight />
              </Link>
              <Link href="/articles" className="btn btn-secondary btn-lg">
                Browse Articles
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <FiBookOpen className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>2,500+</span>
                  <span className={styles.statLabel}>Published Articles</span>
                </div>
              </div>
              <div className={styles.stat}>
                <FiUsers className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>5,000+</span>
                  <span className={styles.statLabel}>Active Researchers</span>
                </div>
              </div>
              <div className={styles.stat}>
                <FiAward className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>95%</span>
                  <span className={styles.statLabel}>Author Satisfaction</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.imageContainer}>
              <div className={styles.floatingCard}>
                <h4>Latest Research</h4>
                <p>A next-generation device for crop yield prediction using IoT and machine learning</p>
                <div className={styles.cardMeta}>
                  <span>Shakik Mahmud</span>
                  <span>•</span>
                  <span>Mar 2023</span>
                </div>
              </div>
              
              <div className={styles.floatingCard}>
                <h4>Peer Review</h4>
                <p>Rigorous evaluation by field experts</p>
                <div className={styles.reviewProgress}>
                  <div className={styles.progressBar}>
                    <div className={styles.progress}></div>
                  </div>
                  <span>85% Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
