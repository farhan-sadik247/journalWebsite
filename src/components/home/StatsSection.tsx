import { FiTrendingUp, FiClock, FiGlobe, FiStar } from 'react-icons/fi';
import styles from './StatsSection.module.scss';

export function StatsSection() {
  const stats = [
    {
      icon: FiTrendingUp,
      number: '2,847',
      label: 'Published Articles',
      description: 'High-quality research papers published this year',
      growth: '+23%',
    },
    {
      icon: FiClock,
      number: '21',
      label: 'Average Review Days',
      description: 'Fast-track peer review process',
      growth: '-15%',
    },
    {
      icon: FiGlobe,
      number: '89',
      label: 'Countries',
      description: 'Global reach with international authors',
      growth: '+12%',
    },
    {
      icon: FiStar,
      number: '4.8',
      label: 'Author Rating',
      description: 'Satisfaction score from published authors',
      growth: '+0.3',
    },
  ];

  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2>Platform Statistics</h2>
          <p>Our commitment to excellence is reflected in our growing community and metrics</p>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>
                <stat.icon />
              </div>
              
              <div className={styles.statContent}>
                <div className={styles.statHeader}>
                  <span className={styles.statNumber}>{stat.number}</span>
                  <span className={`${styles.statGrowth} ${
                    stat.growth.startsWith('+') ? styles.positive : styles.negative
                  }`}>
                    {stat.growth}
                  </span>
                </div>
                
                <h3 className={styles.statLabel}>{stat.label}</h3>
                <p className={styles.statDescription}>{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.additionalMetrics}>
          <div className={styles.metricItem}>
            <div className={styles.metricChart}>
              <div className={styles.progressRing}>
                <svg className={styles.progressSvg} viewBox="0 0 100 100">
                  <circle
                    className={styles.progressBackground}
                    cx="50"
                    cy="50"
                    r="45"
                  />
                  <circle
                    className={styles.progressValue}
                    cx="50"
                    cy="50"
                    r="45"
                    style={{ strokeDasharray: `${95 * 2.83} 283` }}
                  />
                </svg>
                <span className={styles.progressText}>95%</span>
              </div>
            </div>
            <div className={styles.metricInfo}>
              <h4>Acceptance Rate</h4>
              <p>Quality manuscripts accepted after peer review</p>
            </div>
          </div>

          <div className={styles.metricItem}>
            <div className={styles.metricChart}>
              <div className={styles.progressRing}>
                <svg className={styles.progressSvg} viewBox="0 0 100 100">
                  <circle
                    className={styles.progressBackground}
                    cx="50"
                    cy="50"
                    r="45"
                  />
                  <circle
                    className={styles.progressValue}
                    cx="50"
                    cy="50"
                    r="45"
                    style={{ strokeDasharray: `${87 * 2.83} 283` }}
                  />
                </svg>
                <span className={styles.progressText}>87%</span>
              </div>
            </div>
            <div className={styles.metricInfo}>
              <h4>Citation Index</h4>
              <p>Articles cited in other research publications</p>
            </div>
          </div>

          <div className={styles.metricItem}>
            <div className={styles.metricChart}>
              <div className={styles.progressRing}>
                <svg className={styles.progressSvg} viewBox="0 0 100 100">
                  <circle
                    className={styles.progressBackground}
                    cx="50"
                    cy="50"
                    r="45"
                  />
                  <circle
                    className={styles.progressValue}
                    cx="50"
                    cy="50"
                    r="45"
                    style={{ strokeDasharray: `${92 * 2.83} 283` }}
                  />
                </svg>
                <span className={styles.progressText}>92%</span>
              </div>
            </div>
            <div className={styles.metricInfo}>
              <h4>Open Access</h4>
              <p>Freely available research publications</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
