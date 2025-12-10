/**
 * Property-Based Tests for Category Validation Functions
 *
 * **Feature: subcategories**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateDepth,
  validateNoCycle,
  calculateDepth,
  MAX_CATEGORY_DEPTH,
} from './validation';
import { type CategoryNode, getAncestors } from './tree';

// Arbitrary for generating valid category names
const categoryNameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary that generates a deterministic flat category list using fc.integer
const deterministicFlatCategoryListArb = fc
  .tuple(
    fc.array(categoryNameArb, { minLength: 1, maxLength: 10 }),
    fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 10, maxLength: 20 })
  )
  .map(([names, randoms]) => {
    let localIdCounter = 0;
    const categories: CategoryNode[] = [];
    let randomIndex = 0;

    const getNextRandom = () => {
      const val = randoms[randomIndex % randoms.length];
      randomIndex++;
      return val;
    };

    for (let i = 0; i < names.length; i++) {
      const id = `cat-${++localIdCounter}`;
      let parentId: string | null = null;
      let depth = 0;

      if (i > 0 && categories.length > 0) {
        const potentialParents = categories.filter((c) => c.depth < 2);
        if (potentialParents.length > 0) {
          const shouldHaveParent = getNextRandom() > 50;
          if (shouldHaveParent) {
            const parentIndex = getNextRandom() % potentialParents.length;
            const parent = potentialParents[parentIndex];
            parentId = parent.id;
            depth = parent.depth + 1;
          }
        }
      }

      categories.push({
        id,
        name: names[i],
        slug: `slug-${id}`,
        parentId,
        depth,
      });
    }

    return categories;
  });


describe('Property 11: Depth Enforcement', () => {
  /**
   * **Feature: subcategories, Property 11: Depth Enforcement**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Property: For any category at depth 2 (the maximum), attempting to create
   * a child category should be rejected.
   */
  it('rejects creating children under max depth categories', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        // Find categories at max depth
        const maxDepthCategories = categories.filter((c) => c.depth === MAX_CATEGORY_DEPTH);

        for (const category of maxDepthCategories) {
          // Attempting to create a child under a max-depth category should fail
          const isValid = validateDepth(category.id, categories);
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 11: Depth Enforcement**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Property: Creating children under categories with depth < MAX_CATEGORY_DEPTH should be allowed.
   */
  it('allows creating children under non-max depth categories', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        // Find categories below max depth
        const validParentCategories = categories.filter((c) => c.depth < MAX_CATEGORY_DEPTH);

        for (const category of validParentCategories) {
          // Creating a child under a non-max-depth category should succeed
          const isValid = validateDepth(category.id, categories);
          expect(isValid).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 11: Depth Enforcement**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Property: Creating root categories (parentId = null) is always allowed.
   */
  it('always allows creating root categories', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        // Creating a root category should always be valid
        const isValid = validateDepth(null, categories);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 5: Cycle Prevention', () => {
  /**
   * **Feature: subcategories, Property 5: Cycle Prevention**
   * **Validates: Requirements 2.3**
   *
   * Property: For any category C and any category D in C's descendant tree
   * (including C itself), attempting to set D as C's parent should be rejected.
   */
  it('rejects setting self as parent', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          // Setting a category as its own parent should fail
          const isValid = validateNoCycle(category.id, category.id, categories);
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 5: Cycle Prevention**
   * **Validates: Requirements 2.3**
   *
   * Property: Setting a descendant as parent should be rejected.
   */
  it('rejects setting descendant as parent', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        // Find categories with children
        const categoriesWithChildren = categories.filter((c) =>
          categories.some((child) => child.parentId === c.id)
        );

        for (const parent of categoriesWithChildren) {
          // Get all descendants
          const descendants = getDescendantsHelper(parent.id, categories);

          for (const descendant of descendants) {
            // Setting a descendant as parent should fail
            const isValid = validateNoCycle(parent.id, descendant.id, categories);
            expect(isValid).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 5: Cycle Prevention**
   * **Validates: Requirements 2.3**
   *
   * Property: Setting an ancestor as parent should be allowed (valid move up the tree).
   */
  it('allows setting ancestor as parent', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        // Find categories with ancestors (non-root categories)
        const nonRootCategories = categories.filter((c) => c.parentId !== null);

        for (const category of nonRootCategories) {
          const ancestors = getAncestors(category.id, categories);

          for (const ancestor of ancestors) {
            // Setting an ancestor as parent should be valid (no cycle)
            const isValid = validateNoCycle(category.id, ancestor.id, categories);
            expect(isValid).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 5: Cycle Prevention**
   * **Validates: Requirements 2.3**
   *
   * Property: Setting a sibling or unrelated category as parent should be allowed.
   */
  it('allows setting unrelated category as parent', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          // Get ancestors and descendants
          const ancestors = getAncestors(category.id, categories);
          const descendants = getDescendantsHelper(category.id, categories);
          const ancestorIds = new Set(ancestors.map((a) => a.id));
          const descendantIds = new Set(descendants.map((d) => d.id));

          // Find unrelated categories (not self, not ancestor, not descendant)
          const unrelatedCategories = categories.filter(
            (c) =>
              c.id !== category.id &&
              !ancestorIds.has(c.id) &&
              !descendantIds.has(c.id)
          );

          for (const unrelated of unrelatedCategories) {
            // Setting an unrelated category as parent should be valid
            const isValid = validateNoCycle(category.id, unrelated.id, categories);
            expect(isValid).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Helper function to get descendants (duplicated from tree.ts to avoid circular dependency in tests)
function getDescendantsHelper(categoryId: string, categories: CategoryNode[]): CategoryNode[] {
  const childrenMap = new Map<string, CategoryNode[]>();
  for (const category of categories) {
    const parentId = category.parentId ?? '__root__';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(category);
  }

  const descendants: CategoryNode[] = [];
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


describe('Property 12: Depth Equals Ancestor Count', () => {
  /**
   * **Feature: subcategories, Property 12: Depth Equals Ancestor Count**
   * **Validates: Requirements 6.3**
   *
   * Property: For any category, its depth value should equal the number of
   * ancestors (categories in the path from root to parent).
   */
  it('depth equals number of ancestors', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          const ancestors = getAncestors(category.id, categories);

          // The depth should equal the number of ancestors
          expect(category.depth).toBe(ancestors.length);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 12: Depth Equals Ancestor Count**
   * **Validates: Requirements 6.3**
   *
   * Property: calculateDepth returns the correct depth based on parent.
   */
  it('calculateDepth returns parent depth + 1 for non-root', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          if (category.parentId !== null) {
            const parent = categories.find((c) => c.id === category.parentId);
            if (parent) {
              const calculatedDepth = calculateDepth(category.parentId, categories);
              expect(calculatedDepth).toBe(parent.depth + 1);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 12: Depth Equals Ancestor Count**
   * **Validates: Requirements 6.3**
   *
   * Property: calculateDepth returns 0 for root categories (parentId = null).
   */
  it('calculateDepth returns 0 for root categories', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const calculatedDepth = calculateDepth(null, categories);
        expect(calculatedDepth).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
