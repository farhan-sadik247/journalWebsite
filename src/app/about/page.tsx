import { FiTarget, FiUsers, FiAward, FiTrendingUp, FiBookOpen, FiGlobe } from 'react-icons/fi';
import styles from './About.module.scss';

export default function AboutPage() {
  const stats = [
    { icon: FiBookOpen, value: '2,500+', label: 'Published Articles' },
    { icon: FiUsers, value: '1,200+', label: 'Active Researchers' },
    { icon: FiGlobe, value: '45+', label: 'Countries' },
    { icon: FiAward, value: '98%', label: 'Peer Review Rate' },
  ];

  const values = [
    {
      icon: FiTarget,
      title: 'Excellence in Research',
      description: 'We are committed to publishing high-quality research that advances knowledge and drives innovation across all scientific disciplines.',
    },
    {
      icon: FiUsers,
      title: 'Global Collaboration',
      description: 'We foster international collaboration by connecting researchers worldwide and facilitating knowledge exchange.',
    },
    {
      icon: FiTrendingUp,
      title: 'Open Access',
      description: 'We believe in making research accessible to everyone, promoting open science and democratizing knowledge.',
    },
  ];

  return (
    <div className={styles.aboutPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1>About ResearchJournal</h1>
            <p className={styles.heroSubtitle}>
              Advancing scientific knowledge through rigorous peer review and open access publishing
            </p>
            <div className={styles.heroDescription}>
              <p>
                ResearchJournal is a premier academic publishing platform dedicated to disseminating 
                cutting-edge research across all scientific disciplines. Since our founding, we have 
                been committed to maintaining the highest standards of scientific integrity while 
                embracing innovation in scholarly communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <stat.icon className={styles.statIcon} />
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className={styles.mission}>
        <div className="container">
          <div className={styles.missionContent}>
            <div className={styles.missionText}>
              <h2>Our Mission</h2>
              <p>
                To accelerate scientific discovery by providing a trusted platform for researchers 
                to share their findings with the global scientific community. We strive to break 
                down barriers to knowledge access while maintaining the highest standards of 
                scientific rigor through comprehensive peer review.
              </p>
              <p>
                Our commitment extends beyond publishing to fostering collaboration, supporting 
                early-career researchers, and promoting diversity and inclusion in science.
              </p>
            </div>
            <div className={styles.missionImage}>
              <div className={styles.imagePlaceholder}>
                <FiTarget size={80} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.values}>
        <div className="container">
          <h2>Our Core Values</h2>
          <div className={styles.valuesGrid}>
            {values.map((value, index) => (
              <div key={index} className={styles.valueCard}>
                <value.icon className={styles.valueIcon} />
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className={styles.history}>
        <div className="container">
          <div className={styles.historyContent}>
            <h2>Our Journey</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2020</div>
                <div className={styles.timelineContent}>
                  <h3>Foundation</h3>
                  <p>ResearchJournal was founded with the vision of creating an open, accessible platform for scientific publishing.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2021</div>
                <div className={styles.timelineContent}>
                  <h3>First Publications</h3>
                  <p>Published our first peer-reviewed articles, establishing our reputation for quality and rigor.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2022</div>
                <div className={styles.timelineContent}>
                  <h3>Global Expansion</h3>
                  <p>Expanded our editorial board and reviewer network to include experts from over 40 countries.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2023</div>
                <div className={styles.timelineContent}>
                  <h3>Technology Innovation</h3>
                  <p>Launched our advanced manuscript submission and review platform with AI-assisted peer review matching.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2024</div>
                <div className={styles.timelineContent}>
                  <h3>Open Science Initiative</h3>
                  <p>Committed to full open access publishing and launched initiatives to support researchers in developing countries.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2>Join Our Community</h2>
            <p>
              Whether you&apos;re a researcher looking to publish your work, a reviewer contributing 
              to the scientific process, or an institution seeking partnership opportunities, 
              we invite you to be part of our mission.
            </p>
            <div className={styles.ctaButtons}>
              <a href="/submit" className="btn btn-primary btn-lg">
                Submit Your Research
              </a>
              <a href="/contact" className="btn btn-secondary btn-lg">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
