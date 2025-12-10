/**
 * Property-Based Tests for Category Tree Operations
 *
 * **Feature: subcategories**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildCategoryTree,
  flattenTree,
  getAncestors,
  getDescendants,
  type CategoryNode,
} from './tree';

// Helper to generate unique IDs
let idCounter = 0;
const generateId = () => `cat-${++idCounter}`;

// Reset counter before each test run
const resetIdCounter = () => {
  idCounter = 0;
};

// Arbitrary for generating valid category names
const categoryNameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary for generating a flat list of categories with valid parent-child relationships
// This generates categories respecting max depth of 3 (depths 0, 1, 2)
const flatCategoryListArb = fc
  .array(categoryNameArb, { minLength: 1, maxLength: 10 })
  .map((names) => {
    resetIdCounter();
    const categories: CategoryNode[] = [];

    for (let i = 0; i < names.length; i++) {
      const id = generateId();
      let parentId: string | null = null;
      let depth = 0;

      // For non-first categories, potentially assign a parent from existing categories
      if (i > 0 && categories.length > 0) {
        // Filter to categories that can have children (depth < 2)
        const potentialParents = categories.filter((c) => c.depth < 2);
        if (potentialParents.length > 0) {
          // Randomly decide if this should be a child (50% chance) or root
          const shouldHaveParent = Math.random() > 0.5;
          if (shouldHaveParent) {
            const parentIndex = Math.floor(Math.random() * potentialParents.length);
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

describe('Property 3: Tree Structure Correctness', () => {
  /**
   * **Feature: subcategories, Property 3: Tree Structure Correctness**
   * **Validates: Requirements 1.4, 4.4**
   *
   * Property: For any set of categories with parent-child relationships,
   * building the category tree should produce a structure where each category
   * appears exactly once.
   */
  it('each category appears exactly once in the tree', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const tree = buildCategoryTree(categories);
        const flattened = flattenTree(tree);

        // Each category should appear exactly once
        expect(flattened.length).toBe(categories.length);

        // All original IDs should be present
        const originalIds = new Set(categories.map((c) => c.id));
        const flattenedIds = new Set(flattened.map((c) => c.id));
        expect(flattenedIds).toEqual(originalIds);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 3: Tree Structure Correctness**
   * **Validates: Requirements 1.4, 4.4**
   *
   * Property: Each category's children array contains exactly its direct children.
   */
  it('each category contains exactly its direct children', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const tree = buildCategoryTree(categories);

        // Helper to check children recursively
        const checkChildren = (nodes: CategoryNode[]) => {
          for (const node of nodes) {
            // Get expected children from original flat list
            const expectedChildIds = categories
              .filter((c) => c.parentId === node.id)
              .map((c) => c.id)
              .sort();

            // Get actual children
            const actualChildIds = (node.children || []).map((c) => c.id).sort();

            expect(actualChildIds).toEqual(expectedChildIds);

            // Recursively check children
            if (node.children && node.children.length > 0) {
              checkChildren(node.children);
            }
          }
        };

        checkChildren(tree);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 3: Tree Structure Correctness**
   * **Validates: Requirements 1.4, 4.4**
   *
   * Property: Root categories (parentId === null) are at the top level of the tree.
   */
  it('root categories have no parent in the tree', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const tree = buildCategoryTree(categories);

        // Get expected root IDs
        const expectedRootIds = categories
          .filter((c) => c.parentId === null)
          .map((c) => c.id)
          .sort();

        // Get actual root IDs from tree
        const actualRootIds = tree.map((c) => c.id).sort();

        expect(actualRootIds).toEqual(expectedRootIds);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 3: Tree Structure Correctness**
   * **Validates: Requirements 1.4, 4.4**
   *
   * Property: Building then flattening preserves all categories.
   */
  it('build then flatten preserves all categories', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const tree = buildCategoryTree(categories);
        const flattened = flattenTree(tree);

        // All original categories should be present
        const originalIds = categories.map((c) => c.id).sort();
        const flattenedIds = flattened.map((c) => c.id).sort();

        expect(flattenedIds).toEqual(originalIds);
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 8: Ancestor Path Completeness', () => {
  /**
   * **Feature: subcategories, Property 8: Ancestor Path Completeness**
   * **Validates: Requirements 4.1, 5.3**
   *
   * Property: For any category at depth N, retrieving its ancestors should
   * return exactly N categories (not including itself), ordered from root to parent.
   */
  it('ancestor count equals category depth', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          const ancestors = getAncestors(category.id, categories);

          // Number of ancestors should equal the depth
          expect(ancestors.length).toBe(category.depth);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 8: Ancestor Path Completeness**
   * **Validates: Requirements 4.1, 5.3**
   *
   * Property: Ancestors are ordered from root (depth 0) to immediate parent.
   */
  it('ancestors are ordered from root to parent', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          const ancestors = getAncestors(category.id, categories);

          if (ancestors.length > 0) {
            // First ancestor should be a root (depth 0)
            expect(ancestors[0].depth).toBe(0);

            // Last ancestor should be the immediate parent
            expect(ancestors[ancestors.length - 1].id).toBe(category.parentId);

            // Depths should be strictly increasing
            for (let i = 1; i < ancestors.length; i++) {
              expect(ancestors[i].depth).toBe(ancestors[i - 1].depth + 1);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 8: Ancestor Path Completeness**
   * **Validates: Requirements 4.1, 5.3**
   *
   * Property: Each ancestor in the chain is the parent of the next.
   */
  it('ancestor chain forms valid parent-child relationships', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        for (const category of categories) {
          const ancestors = getAncestors(category.id, categories);

          if (ancestors.length > 1) {
            // Each ancestor (except the first) should have the previous as parent
            for (let i = 1; i < ancestors.length; i++) {
              expect(ancestors[i].parentId).toBe(ancestors[i - 1].id);
            }
          }

          // The category's parent should be the last ancestor
          if (ancestors.length > 0) {
            expect(category.parentId).toBe(ancestors[ancestors.length - 1].id);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 8: Ancestor Path Completeness**
   * **Validates: Requirements 4.1, 5.3**
   *
   * Property: Root categories have no ancestors.
   */
  it('root categories have empty ancestor list', () => {
    fc.assert(
      fc.property(deterministicFlatCategoryListArb, (categories: CategoryNode[]) => {
        const rootCategories = categories.filter((c) => c.parentId === null);

        for (const root of rootCategories) {
          const ancestors = getAncestors(root.id, categories);
          expect(ancestors).toEqual([]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
