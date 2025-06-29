import { FiBookOpen, FiUsers, FiEye, FiAward, FiClock, FiShield } from 'react-icons/fi';
import styles from './FeaturesSection.module.scss';

export function FeaturesSection() {
  const features = [
    {
      icon: FiBookOpen,
      title: 'Easy Manuscript Submission',
      description: 'Streamlined submission process with intelligent file handling and version control.',
      color: 'blue',
    },
    {
      icon: FiUsers,
      title: 'Rigorous Peer Review',
      description: 'Double-blind and single-blind review options with expert reviewer matching.',
      color: 'green',
    },
    {
      icon: FiEye,
      title: 'Open Access Publishing',
      description: 'Make your research freely available to the global scientific community.',
      color: 'purple',
    },
    {
      icon: FiAward,
      title: 'Quality Assurance',
      description: 'Comprehensive editorial oversight ensures the highest publication standards.',
      color: 'orange',
    },
    {
      icon: FiClock,
      title: 'Fast Track Review',
      description: 'Expedited review process for urgent and high-impact research.',
      color: 'red',
    },
    {
      icon: FiShield,
      title: 'Ethical Standards',
      description: 'Strict adherence to publication ethics and research integrity guidelines.',
      color: 'teal',
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2>Why Choose Our Platform?</h2>
          <p>
            Experience the future of academic publishing with our comprehensive suite of features 
            designed to support researchers throughout their publication journey.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={`${styles.featureCard} ${styles[feature.color]}`}>
              <div className={styles.featureIcon}>
                <feature.icon />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h3>Ready to Publish Your Research?</h3>
            <p>Join thousands of researchers who trust our platform for their academic publications.</p>
            <div className={styles.ctaButtons}>
              <a href="/submit" className="btn btn-primary btn-lg">
                Start Submission
              </a>
              <a href="/about" className="btn btn-secondary btn-lg">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
