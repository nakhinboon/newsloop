/**
 * Category path utilities for serialization and parsing
 * 
 * **Feature: subcategories**
 */

/**
 * Category path representation
 */
export interface CategoryPath {
  segments: string[];  // Array of category names from root to leaf
  ids: string[];       // Array of category IDs from root to leaf
}

/**
 * Delimiter used for path serialization
 */
const PATH_DELIMITER = '/';

/**
 * Delimiter used for display formatting
 */
const DISPLAY_DELIMITER = ' > ';

/**
 * Serializes a CategoryPath to a string using "/" delimiter
 * 
 * @param path - The CategoryPath to serialize
 * @returns A string representation of the path
 * 
 * @example
 * serializePath({ segments: ['Technology', 'Web Development', 'React'], ids: ['1', '2', '3'] })
 * // Returns: 'Technology/Web Development/React'
 */
export function serializePath(path: CategoryPath): string {
  if (!path.segments || path.segments.length === 0) {
    return '';
  }
  return path.segments.join(PATH_DELIMITER);
}

/**
 * Parses a path string back into a CategoryPath structure
 * Note: IDs cannot be recovered from the string, so empty IDs are returned
 * 
 * @param pathString - The serialized path string
 * @returns A CategoryPath with segments parsed from the string
 * 
 * @example
 * parsePath('Technology/Web Development/React')
 * // Returns: { segments: ['Technology', 'Web Development', 'React'], ids: [] }
 */
export function parsePath(pathString: string): CategoryPath {
  if (!pathString || pathString.trim() === '') {
    return { segments: [], ids: [] };
  }
  
  const segments = pathString.split(PATH_DELIMITER);
  
  return {
    segments,
    ids: []  // IDs cannot be recovered from string representation
  };
}

/**
 * Formats a CategoryPath for user-friendly display using " > " delimiter
 * 
 * @param path - The CategoryPath to format
 * @returns A display-friendly string representation
 * 
 * @example
 * formatPathForDisplay({ segments: ['Technology', 'Web Development', 'React'], ids: ['1', '2', '3'] })
 * // Returns: 'Technology > Web Development > React'
 */
export function formatPathForDisplay(path: CategoryPath): string {
  if (!path.segments || path.segments.length === 0) {
    return '';
  }
  return path.segments.join(DISPLAY_DELIMITER);
}
