/**
 * DOI Utility Functions for GJADT Journal
 * Format: 10.1578/gjadt{year}{volume}{issue}{sequence}
 * Example: 10.1578/gjadt202511123
 */

import dbConnect from '@/lib/mongodb';
import Manuscript from '@/models/Manuscript';
import Correction from '@/models/Correction';

// Journal DOI prefix
export const DOI_PREFIX = '10.1578';
export const JOURNAL_CODE = 'gjadt';

/**
 * Generate DOI for a manuscript
 * @param year Publication year
 * @param volume Volume number (1-99)
 * @param issue Issue number (1-99) 
 * @returns Promise<string> Generated DOI
 */
export async function generateManuscriptDOI(
  year: number,
  volume: number,
  issue: number = 1
): Promise<string> {
  await dbConnect();
  
  // Pad volume and issue to 2 digits
  const volNum = String(volume).padStart(2, '0');
  const issueNum = String(issue).padStart(2, '0');
  
  // Get next sequence number for this year/volume/issue combination
  const sequenceCount = await Manuscript.countDocuments({
    volume: volume,
    issue: issue,
    publishedDate: { $exists: true },
    doi: { $regex: `^${DOI_PREFIX}/${JOURNAL_CODE}${year}${volNum}${issueNum}` }
  });
  
  const sequence = String(sequenceCount + 1).padStart(3, '0');
  
  return `${DOI_PREFIX}/${JOURNAL_CODE}${year}${volNum}${issueNum}${sequence}`;
}

/**
 * Generate DOI for a correction
 * Format: 10.1578/gjadt{year}00{sequence} - using 00 to distinguish corrections
 * @param year Publication year
 * @returns Promise<string> Generated DOI
 */
export async function generateCorrectionDOI(year: number): Promise<string> {
  await dbConnect();
  
  const correctionCount = await Correction.countDocuments({
    status: 'published',
    publishedDate: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });
  
  const sequence = String(correctionCount + 1).padStart(3, '0');
  
  return `${DOI_PREFIX}/${JOURNAL_CODE}${year}00${sequence}`;
}

/**
 * Validate DOI format for the journal
 * @param doi DOI string to validate
 * @returns boolean
 */
export function validateJournalDOI(doi: string): boolean {
  // Journal DOI pattern: 10.1578/gjadt{year}{volume}{issue}{sequence}
  const journalPattern = new RegExp(`^${DOI_PREFIX}/${JOURNAL_CODE}\\d{4}\\d{2}\\d{2}\\d{3}$`);
  
  // Correction DOI pattern: 10.1578/gjadt{year}00{sequence}
  const correctionPattern = new RegExp(`^${DOI_PREFIX}/${JOURNAL_CODE}\\d{4}00\\d{3}$`);
  
  return journalPattern.test(doi) || correctionPattern.test(doi);
}

/**
 * Parse DOI to extract components
 * @param doi DOI string
 * @returns Object with DOI components or null if invalid
 */
export function parseDOI(doi: string): {
  type: 'manuscript' | 'correction';
  year: number;
  volume?: number;
  issue?: number;
  sequence: number;
} | null {
  if (!validateJournalDOI(doi)) {
    return null;
  }
  
  // Remove prefix and journal code
  const suffix = doi.replace(`${DOI_PREFIX}/${JOURNAL_CODE}`, '');
  
  const year = parseInt(suffix.substring(0, 4));
  const volumeIssue = suffix.substring(4, 8);
  const sequence = parseInt(suffix.substring(8, 11));
  
  if (volumeIssue === '00') {
    // Correction
    return {
      type: 'correction',
      year,
      sequence
    };
  } else {
    // Manuscript
    const volume = parseInt(volumeIssue.substring(0, 2));
    const issue = parseInt(volumeIssue.substring(2, 4));
    
    return {
      type: 'manuscript',
      year,
      volume,
      issue,
      sequence
    };
  }
}

/**
 * Generate DOI URL for external linking
 * @param doi DOI string
 * @returns Full URL
 */
export function generateDOIUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

/**
 * Check if DOI already exists in database
 * @param doi DOI string
 * @param excludeId Optional manuscript ID to exclude from check
 * @returns Promise<boolean>
 */
export async function isDOIUnique(doi: string, excludeId?: string): Promise<boolean> {
  await dbConnect();
  
  const query: any = { doi };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const [manuscriptExists, correctionExists] = await Promise.all([
    Manuscript.findOne(query),
    Correction.findOne(query)
  ]);
  
  return !manuscriptExists && !correctionExists;
}
