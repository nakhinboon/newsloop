/**
 * Category validation functions for hierarchical category management
 * 
 * **Feature: subcategories**
 */

import { CategoryNode, getDescendants } from './tree';

/**
 * Maximum allowed depth for categories (0-indexed)
 * Depth 0 = root, Depth 1 = first level subcategory, Depth 2 = second level subcategory
 */
export const MAX_CATEGORY_DEPTH = 2;

/**
 * Calculates the depth for a new category based on its parent
 * 
 * Root categories (parentId === null) have depth 0.
 * Child categories have depth = parent.depth + 1.
 * 
 * @param parentId - The ID of the parent category, or null for root
 * @param categories - Flat array of all CategoryNode objects
 * @returns The calculated depth for the new category
 * 
 * @example
 * const categories = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 }
 * ];
 * calculateDepth(null, categories); // Returns: 0
 * calculateDepth('1', categories);  // Returns: 1
 * calculateDepth('2', categories);  // Returns: 2
 */
export function calculateDepth(parentId: string | null, categories: CategoryNode[]): number {
  if (parentId === null) {
    return 0;
  }

  const parent = categories.find(c => c.id === parentId);
  if (!parent) {
    // Parent not found, treat as root
    return 0;
  }

  return parent.depth + 1;
}

/**
 * Validates that creating a child under the given parent would not exceed max depth
 * 
 * The maximum depth is 2 (allowing 3 levels: 0, 1, 2).
 * A category at depth 2 cannot have children.
 * 
 * @param parentId - The ID of the parent category, or null for root
 * @param categories - Flat array of all CategoryNode objects
 * @returns true if the depth is valid, false if it would exceed the maximum
 * 
 * @example
 * const categories = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 },
 *   { id: '3', name: 'React', parentId: '2', depth: 2 }
 * ];
 * validateDepth(null, categories); // Returns: true (depth 0)
 * validateDepth('1', categories);  // Returns: true (depth 1)
 * validateDepth('2', categories);  // Returns: true (depth 2)
 * validateDepth('3', categories);  // Returns: false (would be depth 3)
 */
export function validateDepth(parentId: string | null, categories: CategoryNode[]): boolean {
  const newDepth = calculateDepth(parentId, categories);
  return newDepth <= MAX_CATEGORY_DEPTH;
}

/**
 * Validates that moving a category to a new parent would not create a cycle
 * 
 * A cycle would occur if:
 * - The category is set as its own parent
 * - The new parent is a descendant of the category
 * 
 * @param categoryId - The ID of the category being moved
 * @param newParentId - The ID of the proposed new parent
 * @param categories - Flat array of all CategoryNode objects
 * @returns true if no cycle would be created, false if a cycle would occur
 * 
 * @example
 * const categories = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 },
 *   { id: '3', name: 'React', parentId: '2', depth: 2 }
 * ];
 * validateNoCycle('1', '2', categories); // Returns: false (2 is descendant of 1)
 * validateNoCycle('1', '1', categories); // Returns: false (self-reference)
 * validateNoCycle('2', '1', categories); // Returns: true (1 is ancestor of 2)
 * validateNoCycle('3', '1', categories); // Returns: true (valid move)
 */
export function validateNoCycle(
  categoryId: string,
  newParentId: string,
  categories: CategoryNode[]
): boolean {
  // Self-reference check
  if (categoryId === newParentId) {
    return false;
  }

  // Check if newParentId is a descendant of categoryId
  const descendants = getDescendants(categoryId, categories);
  const isDescendant = descendants.some(d => d.id === newParentId);
  
  return !isDescendant;
}
