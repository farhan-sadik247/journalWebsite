interface ORCIDProfile {
  orcidId: string;
  name: string;
  biography?: string;
  affiliations: Array<{
    organization: string;
    role?: string;
    startDate?: string;
    endDate?: string;
  }>;
  works: Array<{
    title: string;
    doi?: string;
    publicationDate?: string;
    journal?: string;
  }>;
  verified: boolean;
}

export class ORCIDService {
  private static readonly ORCID_API_BASE = 'https://pub.orcid.org/v3.0';
  private static readonly ORCID_OAUTH_BASE = 'https://orcid.org/oauth';

  /**
   * Validate ORCID ID format
   */
  static validateORCIDFormat(orcidId: string): boolean {
    // ORCID format: 0000-0000-0000-000X (where X can be 0-9 or X)
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    return orcidRegex.test(orcidId);
  }

  /**
   * Format ORCID ID to standard format
   */
  static formatORCIDId(orcidId: string): string {
    // Remove any existing formatting
    const cleaned = orcidId.replace(/[^\dX]/gi, '');
    
    if (cleaned.length !== 16) {
      throw new Error('Invalid ORCID ID length');
    }

    // Add dashes
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
  }

  /**
   * Get ORCID profile information
   */
  static async getORCIDProfile(orcidId: string): Promise<ORCIDProfile | null> {
    try {
      const formattedId = this.formatORCIDId(orcidId);
      
      if (!this.validateORCIDFormat(formattedId)) {
        throw new Error('Invalid ORCID ID format');
      }

      const response = await fetch(`${this.ORCID_API_BASE}/${formattedId}/record`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // ORCID not found
        }
        throw new Error(`ORCID API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.parseORCIDResponse(data, formattedId);
    } catch (error) {
      console.error('Error fetching ORCID profile:', error);
      return null;
    }
  }

  /**
   * Parse ORCID API response
   */
  private static parseORCIDResponse(data: any, orcidId: string): ORCIDProfile {
    const person = data.person;
    const activities = data['activities-summary'];

    // Extract name
    const name = person?.name ? 
      `${person.name['given-names']?.value || ''} ${person.name['family-name']?.value || ''}`.trim() :
      '';

    // Extract biography
    const biography = person?.biography?.content || '';

    // Extract affiliations
    const affiliations = activities?.employments?.['employment-summary']?.map((emp: any) => ({
      organization: emp.organization?.name || '',
      role: emp['role-title'] || '',
      startDate: emp['start-date'] ? this.formatDate(emp['start-date']) : undefined,
      endDate: emp['end-date'] ? this.formatDate(emp['end-date']) : undefined,
    })) || [];

    // Extract works
    const works = activities?.works?.group?.slice(0, 10).map((workGroup: any) => {
      const work = workGroup['work-summary']?.[0];
      return {
        title: work?.title?.title?.value || '',
        doi: work?.['external-ids']?.['external-id']?.find((id: any) => id.type === 'doi')?.value,
        publicationDate: work?.['publication-date'] ? this.formatDate(work['publication-date']) : undefined,
        journal: work?.['journal-title']?.value || '',
      };
    }).filter((work: any) => work.title) || [];

    return {
      orcidId,
      name,
      biography,
      affiliations,
      works,
      verified: true, // Successfully retrieved from ORCID means it's verified
    };
  }

  /**
   * Format date from ORCID API
   */
  private static formatDate(dateObj: any): string {
    if (!dateObj) return '';
    
    const year = dateObj.year?.value || '';
    const month = dateObj.month?.value ? String(dateObj.month.value).padStart(2, '0') : '';
    const day = dateObj.day?.value ? String(dateObj.day.value).padStart(2, '0') : '';

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    } else if (year && month) {
      return `${year}-${month}`;
    } else if (year) {
      return year;
    }
    
    return '';
  }

  /**
   * Generate ORCID OAuth URL for user authentication
   */
  static generateORCIDOAuthURL(clientId: string, redirectUri: string, scope: string = 'read-limited'): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope,
      redirect_uri: redirectUri,
    });

    return `${this.ORCID_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  static async exchangeORCIDCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; orcidId: string; name: string } | null> {
    try {
      const response = await fetch(`${this.ORCID_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        orcidId: data.orcid,
        name: data.name,
      };
    } catch (error) {
      console.error('Error exchanging ORCID OAuth code:', error);
      return null;
    }
  }

  /**
   * Verify ORCID ownership by comparing names
   */
  static verifyORCIDOwnership(
    providedName: string,
    orcidProfile: ORCIDProfile,
    threshold: number = 0.8
  ): boolean {
    if (!orcidProfile.name) return false;

    const normalizedProvided = this.normalizeName(providedName);
    const normalizedORCID = this.normalizeName(orcidProfile.name);

    // Calculate similarity score (simple implementation)
    const similarity = this.calculateNameSimilarity(normalizedProvided, normalizedORCID);
    
    return similarity >= threshold;
  }

  /**
   * Normalize name for comparison
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate name similarity (simple Levenshtein-based approach)
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = name1.split(' ');
    const words2 = name2.split(' ');

    // Check if all words from the shorter name appear in the longer name
    const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
    
    let matches = 0;
    for (const word of shorter) {
      if (longer.some(w => w.includes(word) || word.includes(w))) {
        matches++;
      }
    }

    return matches / shorter.length;
  }

  /**
   * Extract research interests from ORCID profile
   */
  static extractResearchInterests(profile: ORCIDProfile): string[] {
    const interests: string[] = [];

    // Extract from works (journal names, keywords)
    profile.works.forEach(work => {
      if (work.journal) {
        interests.push(work.journal);
      }
    });

    // Extract from affiliations (organization types)
    profile.affiliations.forEach(affiliation => {
      if (affiliation.role) {
        interests.push(affiliation.role);
      }
    });

    // Remove duplicates and return
    const uniqueInterests = new Set(interests);
    return Array.from(uniqueInterests);
  }

  /**
   * Get ORCID URL for display
   */
  static getORCIDUrl(orcidId: string): string {
    const formattedId = this.formatORCIDId(orcidId);
    return `https://orcid.org/${formattedId}`;
  }
}
