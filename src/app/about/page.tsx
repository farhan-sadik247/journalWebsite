import { FiTarget, FiUsers, FiAward, FiTrendingUp, FiBookOpen, FiGlobe } from 'react-icons/fi';
import styles from './About.module.scss';

export default function AboutPage() {
  const focusAreas = [
    {
      icon: FiTarget,
      title: 'AI & Machine Learning',
      description: 'Artificial intelligence algorithms, machine learning models, deep learning architectures, and their applications across various domains.',
    },
    {
      icon: FiUsers,
      title: 'Cybersecurity & Data Privacy',
      description: 'Information security, cryptography, network security, privacy-preserving technologies, and secure system design.',
    },
    {
      icon: FiTrendingUp,
      title: 'IoT & Smart Systems',
      description: 'Internet of Things architectures, smart city technologies, sensor networks, and connected device ecosystems.',
    },
    {
      icon: FiGlobe,
      title: 'Blockchain & Distributed Systems',
      description: 'Distributed ledger technologies, consensus algorithms, decentralized applications, and blockchain implementations.',
    },
    {
      icon: FiBookOpen,
      title: 'Quantum Computing',
      description: 'Quantum algorithms, quantum cryptography, quantum communication, and quantum hardware development.',
    },
    {
      icon: FiAward,
      title: 'Advanced Software Engineering',
      description: 'Software architecture, development methodologies, programming paradigms, and software quality assurance.',
    },
  ];

  return (
    <div className={styles.aboutPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1>About Global Journal of Advanced Technology</h1>
            <p className={styles.heroSubtitle}>
              Advancing Technology Through Rigorous Research and Innovation
            </p>
            <div className={styles.heroDescription}>
              <p>
                The Global Journal of Advanced Technology (GJADT) is a peer-reviewed, open-access academic journal 
                dedicated to publishing high-quality research in the rapidly evolving field of advanced technology. 
                Our mission is to provide a premier platform for researchers, academics, and industry professionals 
                to share groundbreaking discoveries, innovative methodologies, and cutting-edge developments that 
                shape the future of technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className={styles.mission}>
        <div className="container">
          <div className={styles.missionContent}>
            <div className={styles.missionText}>
              <h2>Our Mission & Scope</h2>
              <p>
                GJADT serves as a comprehensive resource for the global technology community, bridging the gap between 
                theoretical research and practical applications. We are committed to fostering innovation, encouraging 
                interdisciplinary collaboration, and promoting the responsible development and deployment of advanced 
                technologies that benefit society as a whole.
              </p>
              <p>
                Our scope encompasses a broad spectrum of advanced technology domains, including but not limited to 
                artificial intelligence, machine learning, cybersecurity, Internet of Things (IoT), blockchain, 
                quantum computing, robotics, and software engineering. We welcome original research articles, review 
                papers, case studies, and technical notes that contribute to the advancement of these fields.
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
            <h2 style={{ color: 'black' }}>Our Focus Areas</h2>
          <div className={styles.valuesGrid}>
            {focusAreas.map((area, index) => (
              <div key={index} className={styles.valueCard}>
                <area.icon className={styles.valueIcon} />
                <h3>{area.title}</h3>
                <p>{area.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className={styles.history}>
        <div className="container">
          <div className={styles.historyContent}>
            <h2>Our Commitment to Excellence</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>Quality</div>
                <div className={styles.timelineContent}>
                  <h3>Rigorous Peer Review</h3>
                  <p>Every submission undergoes a thorough peer review process conducted by experts in the relevant field, ensuring the highest standards of scientific rigor and methodological soundness.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>Access</div>
                <div className={styles.timelineContent}>
                  <h3>Open Access Publishing</h3>
                  <p>We are committed to making cutting-edge research freely accessible to the global community, promoting knowledge sharing and accelerating innovation.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>Global</div>
                <div className={styles.timelineContent}>
                  <h3>International Reach</h3>
                  <p>Our editorial board and reviewer network span across continents, bringing diverse perspectives and expertise to ensure comprehensive evaluation of submissions.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>Impact</div>
                <div className={styles.timelineContent}>
                  <h3>Real-World Applications</h3>
                  <p>We prioritize research that has the potential for practical implementation and societal impact, bridging the gap between academic research and industry needs.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>Ethics</div>
                <div className={styles.timelineContent}>
                  <h3>Responsible Innovation</h3>
                  <p>We promote ethical considerations in technology development, encouraging research that addresses potential risks and ensures responsible deployment of advanced technologies.</p>
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
            <h2>Join the GJADT Community</h2>
            <p>
              Whether you&apos;re a researcher advancing the frontiers of technology, an industry professional 
              implementing innovative solutions, or an academic institution seeking collaboration opportunities, 
              we invite you to contribute to the global discourse on advanced technology.
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
