/**
 * Category tree operations for hierarchical category management
 * 
 * **Feature: subcategories**
 */

/**
 * Category node with hierarchy information
 */
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId: string | null;
  depth: number;
  children?: CategoryNode[];
  postCount?: number;
}

/**
 * Builds a category tree from a flat list of categories
 * 
 * Each category appears exactly once in the tree, with children nested under their parents.
 * Root categories (parentId === null) are at the top level.
 * 
 * @param categories - Flat array of CategoryNode objects
 * @returns Array of root CategoryNode objects with nested children
 * 
 * @example
 * const flat = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 }
 * ];
 * buildCategoryTree(flat);
 * // Returns: [{ id: '1', name: 'Tech', children: [{ id: '2', name: 'Web', children: [] }] }]
 */
export function buildCategoryTree(categories: CategoryNode[]): CategoryNode[] {
  if (!categories || categories.length === 0) {
    return [];
  }

  // Create a map for quick lookup by id
  const categoryMap = new Map<string, CategoryNode>();
  
  // Initialize all categories with empty children arrays
  for (const category of categories) {
    categoryMap.set(category.id, {
      ...category,
      children: []
    });
  }

  const roots: CategoryNode[] = [];

  // Build the tree by linking children to parents
  for (const category of categories) {
    const node = categoryMap.get(category.id)!;
    
    if (category.parentId === null) {
      // Root category
      roots.push(node);
    } else {
      // Find parent and add as child
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children!.push(node);
      } else {
        // Parent not found in list, treat as root
        roots.push(node);
      }
    }
  }

  return roots;
}


/**
 * Flattens a category tree into a flat list
 * 
 * Performs a depth-first traversal of the tree, returning all categories
 * in a flat array. The order is parent-first (pre-order traversal).
 * 
 * @param tree - Array of root CategoryNode objects with nested children
 * @returns Flat array of all CategoryNode objects
 * 
 * @example
 * const tree = [{ id: '1', name: 'Tech', children: [{ id: '2', name: 'Web', children: [] }] }];
 * flattenTree(tree);
 * // Returns: [{ id: '1', name: 'Tech' }, { id: '2', name: 'Web' }]
 */
export function flattenTree(tree: CategoryNode[]): CategoryNode[] {
  if (!tree || tree.length === 0) {
    return [];
  }

  const result: CategoryNode[] = [];

  function traverse(nodes: CategoryNode[]): void {
    for (const node of nodes) {
      // Add the node without children to the result
      const { children, ...nodeWithoutChildren } = node;
      result.push(nodeWithoutChildren as CategoryNode);
      
      // Recursively traverse children
      if (children && children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(tree);
  return result;
}

/**
 * Gets all ancestors of a category, ordered from root to parent
 * 
 * Returns the complete ancestor chain for a category, starting from the root
 * and ending with the immediate parent. Does not include the category itself.
 * 
 * @param categoryId - The ID of the category to find ancestors for
 * @param categories - Flat array of all CategoryNode objects
 * @returns Array of ancestor CategoryNode objects, ordered from root to parent
 * 
 * @example
 * const categories = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 },
 *   { id: '3', name: 'React', parentId: '2', depth: 2 }
 * ];
 * getAncestors('3', categories);
 * // Returns: [{ id: '1', name: 'Tech' }, { id: '2', name: 'Web' }]
 */
export function getAncestors(categoryId: string, categories: CategoryNode[]): CategoryNode[] {
  if (!categories || categories.length === 0) {
    return [];
  }

  // Create a map for quick lookup
  const categoryMap = new Map<string, CategoryNode>();
  for (const category of categories) {
    categoryMap.set(category.id, category);
  }

  const category = categoryMap.get(categoryId);
  if (!category) {
    return [];
  }

  const ancestors: CategoryNode[] = [];
  let currentParentId = category.parentId;

  // Walk up the tree collecting ancestors
  while (currentParentId !== null) {
    const parent = categoryMap.get(currentParentId);
    if (!parent) {
      break;
    }
    ancestors.unshift(parent); // Add to front to maintain root-to-parent order
    currentParentId = parent.parentId;
  }

  return ancestors;
}

/**
 * Gets all descendants of a category
 * 
 * Returns all categories that are children, grandchildren, etc. of the
 * specified category. Does not include the category itself.
 * 
 * @param categoryId - The ID of the category to find descendants for
 * @param categories - Flat array of all CategoryNode objects
 * @returns Array of descendant CategoryNode objects
 * 
 * @example
 * const categories = [
 *   { id: '1', name: 'Tech', parentId: null, depth: 0 },
 *   { id: '2', name: 'Web', parentId: '1', depth: 1 },
 *   { id: '3', name: 'React', parentId: '2', depth: 2 }
 * ];
 * getDescendants('1', categories);
 * // Returns: [{ id: '2', name: 'Web' }, { id: '3', name: 'React' }]
 */
export function getDescendants(categoryId: string, categories: CategoryNode[]): CategoryNode[] {
  if (!categories || categories.length === 0) {
    return [];
  }

  // Build a map of parentId -> children for efficient lookup
  const childrenMap = new Map<string, CategoryNode[]>();
  for (const category of categories) {
    const parentId = category.parentId ?? '__root__';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(category);
  }

  const descendants: CategoryNode[] = [];

  // BFS to collect all descendants
  const queue: string[] = [categoryId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) || [];
    
    for (const child of children) {
      descendants.push(child);
      queue.push(child.id);
    }
  }

  return descendants;
}
