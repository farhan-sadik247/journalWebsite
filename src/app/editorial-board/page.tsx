'use client';

import { useEffect, useState } from 'react';
import { FiMail, FiExternalLink, FiUser, FiMapPin } from 'react-icons/fi';
import styles from './EditorialBoard.module.scss';

interface EditorProfile {
  _id: string;
  name: string;
  email: string;
  affiliation?: string;
  bio?: string;
  expertise?: string[];
  orcid?: string;
  profileImage?: string;
  designation: string;
  designationRole: string;
}

interface DesignationGroup {
  designation: string;
  editors: EditorProfile[];
}

export default function EditorialBoardPage() {
  const [designationGroups, setDesignationGroups] = useState<DesignationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEditorialBoard();
  }, []);

  const fetchEditorialBoard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/editorial-board-assignments');
      const data = await response.json();

      if (data.success && data.assignments) {
        // Group assignments by designation
        const groupsMap: { [key: string]: EditorProfile[] } = {};
        
        data.assignments.forEach((assignment: any) => {
          const editor: EditorProfile = {
            _id: assignment.user._id,
            name: assignment.user.name,
            email: assignment.user.email,
            affiliation: assignment.user.affiliation,
            bio: assignment.user.bio,
            expertise: assignment.user.expertise || [],
            orcid: assignment.user.orcid,
            profileImage: assignment.user.profileImage,
            designation: assignment.designation,
            designationRole: assignment.role
          };

          if (!groupsMap[assignment.designation]) {
            groupsMap[assignment.designation] = [];
          }
          groupsMap[assignment.designation].push(editor);
        });

        // Convert to array format and sort
        const groups = Object.entries(groupsMap).map(([designation, editors]) => ({
          designation,
          editors: editors.sort((a, b) => {
            // Sort by role hierarchy (Editor-in-Chief first, then alphabetically)
            if (a.designationRole.toLowerCase().includes('chief')) return -1;
            if (b.designationRole.toLowerCase().includes('chief')) return 1;
            return a.name.localeCompare(b.name);
          })
        }));

        // Sort designations (Senior first, then alphabetically)
        groups.sort((a, b) => {
          if (a.designation.toLowerCase().includes('senior')) return -1;
          if (b.designation.toLowerCase().includes('senior')) return 1;
          return a.designation.localeCompare(b.designation);
        });

        setDesignationGroups(groups);
      } else {
        setError(data.error || 'Failed to load editorial board');
      }
    } catch (error) {
      console.error('Error fetching editorial board:', error);
      setError('Failed to load editorial board');
    } finally {
      setIsLoading(false);
    }
  };

  // Card component for editors
  const EditorCard = ({ editor }: { editor: EditorProfile }) => (
    <div className={styles.editorCard}>
      <div className={styles.editorHeader}>
        <div className={styles.editorImage}>
          {editor.profileImage ? (
            <img src={editor.profileImage} alt={editor.name} />
          ) : (
            <div className={styles.editorInitials}>
              {editor.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>
        <div className={styles.editorInfo}>
          <h3 className={styles.editorName}>{editor.name}</h3>
          <p className={styles.editorTitle}>{editor.designationRole}</p>
          {editor.affiliation && editor.affiliation.trim() !== '' ? (
            <p className={styles.editorAffiliation}>
              <FiMapPin />
              {editor.affiliation}
            </p>
          ) : (
            <p className={styles.editorAffiliation}>
              <FiMapPin />
              Affiliation not specified
            </p>
          )}
          {editor.orcid && (
            <p className={styles.editorOrcid}>
              ORCID: <a href={`https://orcid.org/${editor.orcid}`} target="_blank" rel="noopener noreferrer">
                {editor.orcid}
              </a>
            </p>
          )}
        </div>
      </div>

      {editor.expertise && editor.expertise.length > 0 && (
        <div className={styles.editorSpecializations}>
          <h4>Areas of Expertise</h4>
          <div className={styles.tags}>
            {editor.expertise.map((spec, index) => (
              <span key={index} className={styles.tag}>{spec}</span>
            ))}
          </div>
        </div>
      )}

      {editor.bio && editor.bio.trim() !== '' ? (
        <div className={styles.editorBio}>
          <h4>Biography</h4>
          <p>{editor.bio}</p>
        </div>
      ) : (
        <div className={styles.editorBio}>
          <h4>Biography</h4>
          <p><em>Biography not available</em></p>
        </div>
      )}

      <div className={styles.editorActions}>
        <a href={`mailto:${editor.email}`} className={styles.contactButton}>
          <FiMail />
          Contact
        </a>
        {editor.orcid && (
          <a 
            href={`https://orcid.org/${editor.orcid}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.orcidButton}
          >
            <FiExternalLink />
            ORCID Profile
          </a>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={styles.editorialPage}>
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroContent}>
              <h1>Editorial Board</h1>
              <p className={styles.heroSubtitle}>Loading our distinguished panel of experts...</p>
            </div>
          </div>
        </section>
        <div className="container">
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.editorialPage}>
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroContent}>
              <h1>Editorial Board</h1>
              <p className={styles.heroSubtitle}>Unable to load editorial board</p>
            </div>
          </div>
        </section>
        <div className="container">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchEditorialBoard}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorialPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1>Editorial Board</h1>
            <p className={styles.heroSubtitle}>
              Meet our distinguished panel of experts committed to advancing scientific knowledge
            </p>
            <div className={styles.heroDescription}>
              <p>
                Our editorial board consists of internationally recognized scholars and researchers 
                who ensure the highest standards of peer review and scientific integrity. Each member 
                brings extensive expertise in their respective fields and is committed to fostering 
                innovation and excellence in scientific publishing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Board by Designations */}
      {designationGroups.length > 0 ? (
        designationGroups.map((group) => (
          <section key={group.designation} className={styles.designationSection}>
            <div className="container">
              <h2 className={styles.designationTitle}>{group.designation}</h2>
              <div className={styles.editorsGrid}>
                {group.editors.map((editor) => (
                  <EditorCard key={editor._id} editor={editor} />
                ))}
              </div>
            </div>
          </section>
        ))
      ) : (
        /* Empty State */
        <section className={styles.emptyState}>
          <div className="container">
            <div className="text-center py-12">
              <FiUser className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Editorial Board Members</h3>
              <p className="text-gray-500">
                The editorial board is currently being assembled. Please check back soon.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Editorial Process */}
      <section className={styles.editorialProcess}>
        <div className="container">
          <h2>Our Editorial Process</h2>
          <div className={styles.processGrid}>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>1</div>
              <h3>Initial Review</h3>
              <p>All submissions undergo initial editorial review for scope, quality, and adherence to journal standards.</p>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>2</div>
              <h3>Peer Review Assignment</h3>
              <p>Manuscripts are assigned to expert reviewers based on their expertise and research background.</p>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>3</div>
              <h3>Expert Review</h3>
              <p>Independent experts provide detailed feedback on methodology, significance, and scientific rigor.</p>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>4</div>
              <h3>Editorial Decision</h3>
              <p>Associate editors make recommendations, and final decisions are made based on reviewer feedback.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Join Board CTA */}
      <section className={styles.joinBoard}>
        <div className="container">
          <div className={styles.joinContent}>
            <h2>Join Our Editorial Board</h2>
            <p>
              We are always looking for distinguished researchers to join our editorial board. 
              If you are interested in contributing to the advancement of scientific publishing 
              and have expertise in your field, we would love to hear from you.
            </p>
            <div className={styles.requirements}>
              <h3>Requirements:</h3>
              <ul>
                <li>PhD or equivalent in relevant field</li>
                <li>Strong publication record and peer review experience</li>
                <li>Recognition in the academic community</li>
                <li>Commitment to scientific integrity and excellence</li>
              </ul>
            </div>
            <a href="/contact" className="btn btn-primary btn-lg">
              Express Interest
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
