/**
 * Utility functions for manuscript data transformation
 */

/**
 * Transform author name from database format (single 'name' field) 
 * to frontend format (firstName and lastName fields)
 */
export function transformAuthorForFrontend(author: any) {
  const nameParts = author.name.split(' ');
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: author.email,
    affiliation: author.affiliation,
    orcid: author.orcid || '',
    isCorresponding: author.isCorresponding || false,
  };
}

/**
 * Transform author from frontend format (firstName and lastName) 
 * to database format (single 'name' field)
 */
export function transformAuthorForDatabase(author: any) {
  return {
    name: `${author.firstName} ${author.lastName}`.trim(),
    email: author.email,
    affiliation: author.affiliation,
    orcid: author.orcid || '',
    isCorresponding: author.isCorresponding || false,
  };
}

/**
 * Transform manuscript data for frontend compatibility
 * Converts authors from database format to frontend format
 */
export function transformManuscriptForFrontend(manuscript: any) {
  if (!manuscript) return manuscript;
  
  const transformed = { ...manuscript };
  
  if (transformed.authors && Array.isArray(transformed.authors)) {
    transformed.authors = transformed.authors.map(transformAuthorForFrontend);
  }
  
  return transformed;
}

/**
 * Transform multiple manuscripts for frontend compatibility
 */
export function transformManuscriptsForFrontend(manuscripts: any[]) {
  return manuscripts.map(transformManuscriptForFrontend);
}
