'use client';

import { useEffect, useState } from 'react';
import { FiMail, FiExternalLink, FiAward, FiBookOpen, FiUser, FiMapPin } from 'react-icons/fi';
import styles from './EditorialBoard.module.scss';

interface EditorProfile {
  _id: string;
  name: string;
  email: string;
  affiliation: string;
  bio: string;
  specializations: string[];
  orcid?: string;
  profileImage?: string;
  joinedDate: string;
  isFounder?: boolean;
  roles?: string[];
  currentRole?: string;
  designation?: string;
  designationRole?: string;
}

interface DesignationGroup {
  name: string;
  roles: Array<{ _id: string, name: string }>;
  editors: EditorProfile[];
}

interface GroupedEditors {
  noDesignation: EditorProfile[];
  byDesignation: { [key: string]: DesignationGroup };
}

export default function EditorialBoardPage() {
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [groupedEditors, setGroupedEditors] = useState<GroupedEditors>({ noDesignation: [], byDesignation: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEditorialBoard();
  }, []);

  const fetchEditorialBoard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/editorial-board');
      const data = await response.json();

      if (data.success) {
        setEditors(data.editors);
        if (data.groupedEditors) {
          setGroupedEditors(data.groupedEditors);
        }
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

  // Separate editors by their role/position from the non-designation group
  const noDesignationEditors = groupedEditors.noDesignation || [];
  
  const founderEditor = editors.find(editor => editor.isFounder);
  
  // Editor-in-Chief is either the founder or someone with "Chief" in their designation role
  const editorInChief = 
    editors.find(editor => editor.designation && editor.designationRole?.toLowerCase().includes('chief')) ||
    founderEditor || 
    (noDesignationEditors.length > 0 ? noDesignationEditors[0] : null);
  
  // Remove editor-in-chief from the no designation group if found there
  const remainingNoDesignation = noDesignationEditors.filter(editor => editor !== editorInChief);
  
  // For backwards compatibility, treat the rest as associate editors and board members
  const associateEditors = remainingNoDesignation.slice(0, 2); // First 2 as associate editors
  const boardMembers = remainingNoDesignation.slice(2); // The rest as board members

  // Card component for Editor-in-Chief and other designated editors
  const EditorCard = ({ editor, isChief = false }: { editor: EditorProfile; isChief?: boolean }) => (
    <div className={`${styles.editorCard} ${isChief ? styles.editorChief : ''}`}>
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
          <p className={styles.editorTitle}>
            {editor.designation ? 
              (editor.designationRole ? `${editor.designation} - ${editor.designationRole}` : editor.designation) :
              editor.isFounder ? 'Founder & Editor-in-Chief' :
              isChief ? 'Editor-in-Chief' : 
              associateEditors.includes(editor) ? 'Associate Editor' : 'Editorial Board Member'}
          </p>
          <p className={styles.editorAffiliation}>
            <FiMapPin />
            {editor.affiliation}
          </p>
          {editor.orcid && (
            <p className={styles.editorOrcid}>
              ORCID: <a href={`https://orcid.org/${editor.orcid}`} target="_blank" rel="noopener noreferrer">
                {editor.orcid}
              </a>
            </p>
          )}
        </div>
      </div>

      {editor.specializations && editor.specializations.length > 0 && (
        <div className={styles.editorSpecializations}>
          <h4>Areas of Expertise</h4>
          <div className={styles.tags}>
            {editor.specializations.map((spec, index) => (
              <span key={index} className={styles.tag}>{spec}</span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.editorBio}>
        <p>{editor.bio}</p>
      </div>

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
  
  // List item component for Associate Editors
  const EditorListItem = ({ editor }: { editor: EditorProfile }) => (
    <div className={styles.editorListItem}>
      <div className={styles.editorImage}>
        {editor.profileImage ? (
          <img src={editor.profileImage} alt={editor.name} />
        ) : (
          <div className={styles.editorInitials}>
            {editor.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
      <div className={styles.editorListInfo}>
        <h3 className={styles.editorName}>{editor.name}</h3>
        <p className={styles.editorTitle}>
          {editor.designation ? 
            (editor.designationRole ? `${editor.designationRole}` : editor.designation) :
            'Associate Editor'}
        </p>
        <p className={styles.editorEmail}>
          <FiMail />
          <a href={`mailto:${editor.email}`}>{editor.email}</a>
        </p>
      </div>
      <div className={styles.editorContactBtn}>
        <a href={`mailto:${editor.email}`}>
          <FiMail />
          Contact
        </a>
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

      {/* Editor-in-Chief */}
      {editorInChief && (
        <section className={styles.editorInChief}>
          <div className="container">
            <h2>Editor-in-Chief</h2>
            <EditorCard editor={editorInChief} isChief={true} />
          </div>
        </section>
      )}

      {/* Associate Editors - Displayed as cards grouped by designation categories */}
      {(Object.keys(groupedEditors.byDesignation).length > 0 || associateEditors.length > 0) && (
        <section className={styles.associateEditors}>
          <div className="container">
            <h2>Associate Editors</h2>
            <div className={styles.designationCards}>
              {/* Cards for designation categories */}
              {Object.entries(groupedEditors.byDesignation).map(([designationName, group]) => (
                <div key={designationName} className={styles.designationCard}>
                  <div className={styles.designationCardHeader}>
                    <h3>{designationName}</h3>
                  </div>
                  <div className={styles.designationCardBody}>
                    {group.editors.length > 0 ? (
                      <ul className={styles.editorsList}>
                        {group.editors.map((editor) => (
                          <li key={editor._id} className={styles.editorListItem}>
                            <div className={styles.editorInfo}>
                              <strong className={styles.editorName}>{editor.name}</strong>
                              {editor.designationRole && (
                                <span className={styles.editorRole}>{editor.designationRole}</span>
                              )}
                              <a href={`mailto:${editor.email}`} className={styles.editorEmail}>
                                <FiMail />
                                {editor.email}
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noEditors}>No editors assigned to this designation yet.</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Card for editors without special designation */}
              {associateEditors.length > 0 && (
                <div className={styles.designationCard}>
                  <div className={styles.designationCardHeader}>
                    <h3>General Associate Editors</h3>
                  </div>
                  <div className={styles.designationCardBody}>
                    <ul className={styles.editorsList}>
                      {associateEditors.map((editor) => (
                        <li key={editor._id} className={styles.editorListItem}>
                          <div className={styles.editorInfo}>
                            <strong className={styles.editorName}>{editor.name}</strong>
                            <span className={styles.editorRole}>Associate Editor</span>
                            <a href={`mailto:${editor.email}`} className={styles.editorEmail}>
                              <FiMail />
                              {editor.email}
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Editorial Board Members (from those without special designation) */}
      {boardMembers.length > 0 && (
        <section className={styles.boardMembers}>
          <div className="container">
            <h2>Editorial Board Members</h2>
            <div className={styles.editorsGrid}>
              {boardMembers.map((editor) => (
                <EditorCard key={editor._id} editor={editor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {editors.length === 0 && (
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
