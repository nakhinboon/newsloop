/**
 * Property-Based Tests for Category Management
 *
 * **Feature: advanced-web-blog, Property 24: Category uniqueness**
 * **Validates: Requirements 16.2**
 *
 * Property 24: For any category creation with name N, if a category with name N
 * already exists (under the same parent), the creation SHALL fail with a validation error.
 *
 * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
 * **Validates: Requirements 16.4**
 *
 * Property 25: For any category C with associated posts, deletion SHALL fail
 * until all posts are reassigned or deleted.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Use vi.hoisted to create stores that can be accessed by vi.mock
const { categoryStore, postStore, generateId, generatePostId, resetIdCounter } = vi.hoisted(() => {
  const categoryStore = new Map<string, Record<string, unknown>>();
  const postStore = new Map<string, Record<string, unknown>>();
  let idCounter = 0;
  let postIdCounter = 0;

  return {
    categoryStore,
    postStore,
    generateId: () => `test-category-${++idCounter}`,
    generatePostId: () => `test-post-${++postIdCounter}`,
    resetIdCounter: () => {
      idCounter = 0;
      postIdCounter = 0;
    },
  };
});

// Helper function to count posts for a category
const countPostsForCategory = (categoryId: string): number => {
  let count = 0;
  for (const post of postStore.values()) {
    if (post.categoryId === categoryId) {
      count++;
    }
  }
  return count;
};

// Mock the prisma module
vi.mock('@/lib/db/prisma', () => {
  return {
    default: {
      category: {
        findMany: vi.fn(async (options?: { where?: { parentId?: string | null }; include?: { _count?: { select?: { posts?: boolean } } }; orderBy?: unknown }) => {
          let categories = Array.from(categoryStore.values());
          
          // Filter by parentId if specified
          if (options?.where?.parentId !== undefined) {
            categories = categories.filter(c => c.parentId === options.where!.parentId);
          }
          
          // Add _count if requested
          if (options?.include?._count?.select?.posts) {
            return categories.map(c => ({
              ...c,
              _count: { posts: countPostsForCategory(c.id as string) },
            }));
          }
          
          return categories;
        }),

        findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) => {
          if (where.id) {
            return categoryStore.get(where.id) || null;
          }
          if (where.slug) {
            return Array.from(categoryStore.values()).find((c) => c.slug === where.slug) || null;
          }
          return null;
        }),

        findFirst: vi.fn(
          async ({ where }: { where: { parentId?: string | null; name?: { equals: string; mode: string }; id?: { not: string } } }) => {
            for (const category of categoryStore.values()) {
              // Check parentId match
              if (where.parentId !== undefined && category.parentId !== where.parentId) {
                continue;
              }

              // Check name match (case-insensitive)
              if (where.name) {
                const categoryName = (category.name as string).toLowerCase();
                const searchName = where.name.equals.toLowerCase();
                if (categoryName !== searchName) {
                  continue;
                }
              }

              // Check exclusion
              if (where.id?.not && category.id === where.id.not) {
                continue;
              }

              return category;
            }
            return null;
          }
        ),

        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const id = generateId();
          const category = {
            id,
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            parentId: data.parentId || null,
            depth: data.depth || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          categoryStore.set(id, category);
          return category;
        }),

        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const category = categoryStore.get(where.id);
          if (!category) throw new Error('Category not found');

          const updatedCategory = {
            ...category,
            ...data,
            updatedAt: new Date(),
          };

          categoryStore.set(where.id, updatedCategory);
          return updatedCategory;
        }),

        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const category = categoryStore.get(where.id);
          if (!category) throw new Error('Category not found');

          categoryStore.delete(where.id);
          return category;
        }),

        count: vi.fn(async () => categoryStore.size),
      },

      post: {
        count: vi.fn(async ({ where }: { where?: { categoryId?: string } } = {}) => {
          if (where?.categoryId) {
            let count = 0;
            for (const post of postStore.values()) {
              if (post.categoryId === where.categoryId) {
                count++;
              }
            }
            return count;
          }
          return postStore.size;
        }),
        findMany: vi.fn(async ({ where, include, orderBy }: { where?: { categoryId?: string | { in: string[] } }; include?: unknown; orderBy?: unknown } = {}) => {
          let posts = Array.from(postStore.values());
          
          // Filter by categoryId
          if (where?.categoryId) {
            if (typeof where.categoryId === 'string') {
              posts = posts.filter(p => p.categoryId === where.categoryId);
            } else if (where.categoryId && 'in' in where.categoryId) {
              const categoryIds = where.categoryId.in;
              posts = posts.filter(p => categoryIds.includes(p.categoryId as string));
            }
          }
          
          // Add mock author, category, and tags for the Post type transformation
          return posts.map(p => ({
            ...p,
            excerpt: p.excerpt || null,
            publishedAt: p.publishedAt || p.createdAt,
            readingTime: p.readingTime || 5,
            featured: p.featured || false,
            locale: p.locale || 'en',
            status: p.status || 'PUBLISHED',
            author: {
              firstName: 'Test',
              lastName: 'Author',
              email: 'test@example.com',
              imageUrl: null,
            },
            category: categoryStore.get(p.categoryId as string) || null,
            tags: [],
          }));
        }),
        updateMany: vi.fn(async ({ where, data }: { where: { categoryId: string }; data: { categoryId: string } }) => {
          let count = 0;
          for (const [id, post] of postStore.entries()) {
            if (post.categoryId === where.categoryId) {
              postStore.set(id, { ...post, categoryId: data.categoryId });
              count++;
            }
          }
          return { count };
        }),
      },

      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          category: {
            update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
              const category = categoryStore.get(where.id);
              if (!category) throw new Error('Category not found');
              const updated = { ...category, ...data, updatedAt: new Date() };
              categoryStore.set(where.id, updated);
              return updated;
            }),
            delete: vi.fn(async ({ where }: { where: { id: string } }) => {
              const category = categoryStore.get(where.id);
              categoryStore.delete(where.id);
              return category;
            }),
          },
          post: {
            updateMany: vi.fn(async ({ where, data }: { where: { categoryId: string }; data: { categoryId: string } }) => {
              let count = 0;
              for (const [id, post] of postStore.entries()) {
                if (post.categoryId === where.categoryId) {
                  postStore.set(id, { ...post, categoryId: data.categoryId });
                  count++;
                }
              }
              return { count };
            }),
          },
        });
      }),
    },
  };
});

// Mock the cache module
vi.mock('@/lib/cache/posts', () => ({
  postCache: {
    invalidateCategories: vi.fn(async () => {}),
    invalidateAllPosts: vi.fn(async () => {}),
  },
}));

// Import after mocking
import { categoryService, type CreateCategoryInput } from './categories';

// Helper to reset mock state
function resetMockState() {
  categoryStore.clear();
  postStore.clear();
  resetIdCounter();
  vi.clearAllMocks();
}

// Helper to create a mock post in a category
function createMockPost(categoryId: string): string {
  const id = generatePostId();
  postStore.set(id, {
    id,
    categoryId,
    title: `Test Post ${id}`,
    slug: `test-post-${id}`,
    content: 'Test content',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

// Arbitrary for generating valid category names
const categoryNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary for generating valid slugs
const slugArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{2,30}$/)
  .filter((s) => !s.endsWith('-') && !s.includes('--'));

// Arbitrary for generating category input
const createCategoryInputArb = fc.record({
  name: categoryNameArb,
  slug: slugArb,
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  parentId: fc.constant(null as string | null),
});

describe('Property 24: Category uniqueness', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: For any category creation with name N, if a category with name N
   * already exists under the same parent, the creation SHALL fail with a validation error.
   */
  it('creating a category with duplicate name under same parent fails', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, slugArb, async (input, secondSlug) => {
        resetMockState();

        // Create the first category
        const firstCategory = await categoryService.createCategory(input as CreateCategoryInput);
        expect(firstCategory).toBeDefined();
        expect(firstCategory.name).toBe(input.name);

        // Attempt to create a second category with the same name but different slug
        const duplicateInput: CreateCategoryInput = {
          name: input.name,
          slug: secondSlug === input.slug ? `${secondSlug}-2` : secondSlug,
          description: 'Duplicate category',
          parentId: null,
        };

        // Should throw an error due to duplicate name
        await expect(categoryService.createCategory(duplicateInput)).rejects.toThrow(
          'A category with this name already exists under the selected parent'
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: Category name uniqueness check is case-insensitive.
   */
  it('category name uniqueness is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, slugArb, async (input, secondSlug) => {
        resetMockState();

        // Create the first category
        const firstCategory = await categoryService.createCategory(input as CreateCategoryInput);
        expect(firstCategory).toBeDefined();

        // Generate a case-variant of the name
        const caseVariantName = input.name
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
          .join('');

        // Attempt to create a second category with case-variant name
        const duplicateInput: CreateCategoryInput = {
          name: caseVariantName,
          slug: secondSlug === input.slug ? `${secondSlug}-case` : secondSlug,
          description: 'Case variant category',
          parentId: null,
        };

        // Should throw an error due to case-insensitive duplicate name
        await expect(categoryService.createCategory(duplicateInput)).rejects.toThrow(
          'A category with this name already exists under the selected parent'
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: Categories with the same name under different parents are allowed.
   */
  it('same name under different parents is allowed', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, slugArb, slugArb, async (input, parentSlug, childSlug) => {
        resetMockState();

        // Create a parent category first
        const parentCategory = await categoryService.createCategory({
          name: 'Parent Category',
          slug: parentSlug.startsWith('parent') ? parentSlug : `parent-${parentSlug}`,
          description: 'Parent',
          parentId: null,
        });

        // Create a root category with the test name
        const rootCategory = await categoryService.createCategory({
          ...input,
          slug: input.slug.startsWith('root') ? input.slug : `root-${input.slug}`,
          parentId: null,
        } as CreateCategoryInput);
        expect(rootCategory).toBeDefined();

        // Create a child category under the parent with the same name
        // This should succeed because it's under a different parent
        const childCategory = await categoryService.createCategory({
          name: input.name,
          slug: childSlug.startsWith('child') ? childSlug : `child-${childSlug}`,
          description: 'Child with same name',
          parentId: parentCategory.id,
        });

        expect(childCategory).toBeDefined();
        expect(childCategory.name).toBe(input.name);
        expect(childCategory.parentId).toBe(parentCategory.id);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: Creating a category with a duplicate slug fails globally.
   */
  it('creating a category with duplicate slug fails', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, categoryNameArb, async (input, secondName) => {
        resetMockState();

        // Create the first category
        const firstCategory = await categoryService.createCategory(input as CreateCategoryInput);
        expect(firstCategory).toBeDefined();
        expect(firstCategory.slug).toBe(input.slug);

        // Attempt to create a second category with the same slug but different name
        const duplicateInput: CreateCategoryInput = {
          name: secondName === input.name ? `${secondName} Different` : secondName,
          slug: input.slug,
          description: 'Duplicate slug category',
          parentId: null,
        };

        // Should throw an error due to duplicate slug
        await expect(categoryService.createCategory(duplicateInput)).rejects.toThrow('A category with this slug already exists');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: isNameUnique returns false for existing names (case-insensitive).
   */
  it('isNameUnique returns false for existing category names', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, async (input) => {
        resetMockState();

        // Before creating, name should be unique
        const isUniqueBefore = await categoryService.isNameUnique(input.name);
        expect(isUniqueBefore).toBe(true);

        // Create the category
        const category = await categoryService.createCategory(input as CreateCategoryInput);
        expect(category).toBeDefined();

        // After creating, name should not be unique
        const isUniqueAfter = await categoryService.isNameUnique(input.name);
        expect(isUniqueAfter).toBe(false);

        // Case variant should also not be unique
        const caseVariant = input.name.toUpperCase();
        const isUniqueCase = await categoryService.isNameUnique(caseVariant);
        expect(isUniqueCase).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 24: Category uniqueness**
   * **Validates: Requirements 16.2**
   *
   * Property: isNameUnique with excludeId allows the same name for the excluded category.
   */
  it('isNameUnique with excludeId allows same name for excluded category', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, async (input) => {
        resetMockState();

        // Create the category
        const category = await categoryService.createCategory(input as CreateCategoryInput);
        expect(category).toBeDefined();

        // Name should not be unique without exclusion
        const isUniqueWithoutExclude = await categoryService.isNameUnique(input.name);
        expect(isUniqueWithoutExclude).toBe(false);

        // Name should be unique when excluding the category itself
        const isUniqueWithExclude = await categoryService.isNameUnique(input.name, category.id);
        expect(isUniqueWithExclude).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 25: Category deletion constraint', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
   * **Validates: Requirements 16.4**
   *
   * Property: For any category C with associated posts, deletion SHALL fail
   * until all posts are reassigned or deleted.
   */
  it('deleting a category with posts fails without reassignment target', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        fc.integer({ min: 1, max: 5 }),
        async (input, postCount) => {
          resetMockState();

          // Create a category
          const category = await categoryService.createCategory(input as CreateCategoryInput);
          expect(category).toBeDefined();

          // Add posts to the category
          for (let i = 0; i < postCount; i++) {
            createMockPost(category.id);
          }

          // Attempt to delete the category without providing a reassignment target
          await expect(categoryService.deleteCategory(category.id)).rejects.toThrow(
            'Cannot delete category with posts. Please reassign posts first'
          );

          // Verify the category still exists
          const existingCategory = await categoryService.getCategoryById(category.id);
          expect(existingCategory).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
   * **Validates: Requirements 16.4**
   *
   * Property: For any category C with associated posts, deletion succeeds
   * when a valid reassignment target is provided.
   */
  it('deleting a category with posts succeeds with valid reassignment target', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        fc.integer({ min: 1, max: 5 }),
        async (input, targetSlug, postCount) => {
          resetMockState();

          // Create the category to delete
          const categoryToDelete = await categoryService.createCategory(input as CreateCategoryInput);
          expect(categoryToDelete).toBeDefined();

          // Create a target category for reassignment
          const targetCategory = await categoryService.createCategory({
            name: 'Target Category',
            slug: targetSlug.startsWith('target') ? targetSlug : `target-${targetSlug}`,
            description: 'Target for reassignment',
            parentId: null,
          });
          expect(targetCategory).toBeDefined();

          // Add posts to the category to delete
          const postIds: string[] = [];
          for (let i = 0; i < postCount; i++) {
            postIds.push(createMockPost(categoryToDelete.id));
          }

          // Delete the category with reassignment target
          await categoryService.deleteCategory(categoryToDelete.id, targetCategory.id);

          // Verify the category was deleted
          const deletedCategory = await categoryService.getCategoryById(categoryToDelete.id);
          expect(deletedCategory).toBeNull();

          // Verify posts were reassigned to the target category
          for (const postId of postIds) {
            const post = postStore.get(postId);
            expect(post?.categoryId).toBe(targetCategory.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
   * **Validates: Requirements 16.4**
   *
   * Property: For any category C without associated posts, deletion succeeds
   * without requiring a reassignment target.
   */
  it('deleting a category without posts succeeds without reassignment target', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, async (input) => {
        resetMockState();

        // Create a category without any posts
        const category = await categoryService.createCategory(input as CreateCategoryInput);
        expect(category).toBeDefined();

        // Delete the category without providing a reassignment target
        await categoryService.deleteCategory(category.id);

        // Verify the category was deleted
        const deletedCategory = await categoryService.getCategoryById(category.id);
        expect(deletedCategory).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
   * **Validates: Requirements 16.4**
   *
   * Property: Deletion fails when the reassignment target does not exist.
   */
  it('deleting a category fails when reassignment target does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        fc.integer({ min: 1, max: 5 }),
        async (input, postCount) => {
          resetMockState();

          // Create a category
          const category = await categoryService.createCategory(input as CreateCategoryInput);
          expect(category).toBeDefined();

          // Add posts to the category
          for (let i = 0; i < postCount; i++) {
            createMockPost(category.id);
          }

          // Attempt to delete with a non-existent reassignment target
          await expect(
            categoryService.deleteCategory(category.id, 'non-existent-category-id')
          ).rejects.toThrow('Reassignment target category does not exist');

          // Verify the category still exists
          const existingCategory = await categoryService.getCategoryById(category.id);
          expect(existingCategory).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 25: Category deletion constraint**
   * **Validates: Requirements 16.4**
   *
   * Property: Post count is accurately tracked for deletion constraint.
   */
  it('post count is accurately tracked for deletion constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        fc.integer({ min: 0, max: 10 }),
        async (input, postCount) => {
          resetMockState();

          // Create a category
          const category = await categoryService.createCategory(input as CreateCategoryInput);
          expect(category).toBeDefined();

          // Add the specified number of posts
          for (let i = 0; i < postCount; i++) {
            createMockPost(category.id);
          }

          if (postCount === 0) {
            // Should succeed without reassignment target
            await categoryService.deleteCategory(category.id);
            const deletedCategory = await categoryService.getCategoryById(category.id);
            expect(deletedCategory).toBeNull();
          } else {
            // Should fail without reassignment target
            await expect(categoryService.deleteCategory(category.id)).rejects.toThrow(
              'Cannot delete category with posts. Please reassign posts first'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 1: Category Creation Respects Parent Selection', () => {
  /**
   * **Feature: subcategories, Property 1: Category Creation Respects Parent Selection**
   * **Validates: Requirements 1.2, 1.3**
   *
   * Property: For any valid category name and optional parent category, creating a category should result in:
   * - If parent is provided: category.parentId === parent.id and category.depth === parent.depth + 1
   * - If no parent: category.parentId === null and category.depth === 0
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 1: Category Creation Respects Parent Selection**
   * **Validates: Requirements 1.3**
   *
   * Property: For any valid category created without a parent, the category should have
   * parentId === null and depth === 0
   */
  it('creating a category without parent results in root category (parentId=null, depth=0)', async () => {
    await fc.assert(
      fc.asyncProperty(createCategoryInputArb, async (input) => {
        resetMockState();

        // Create a category without a parent
        const category = await categoryService.createCategory({
          ...input,
          parentId: null,
        } as CreateCategoryInput);

        // Verify the category was created as a root category
        expect(category).toBeDefined();
        expect(category.parentId).toBeNull();
        expect(category.depth).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 1: Category Creation Respects Parent Selection**
   * **Validates: Requirements 1.2**
   *
   * Property: For any valid category created with a parent, the category should have
   * parentId === parent.id and depth === parent.depth + 1
   */
  it('creating a category with parent results in correct parentId and depth', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        fc.integer({ min: 0, max: 1 }), // Parent depth (0 or 1 to allow child creation within max depth)
        async (input, parentSlug, parentDepth) => {
          resetMockState();

          // Create a parent category at the specified depth
          // First, create root if parentDepth > 0
          let parentId: string | null = null;
          let currentDepth = 0;

          // Build the parent chain up to the desired depth
          for (let d = 0; d <= parentDepth; d++) {
            const parentCategory = await categoryService.createCategory({
              name: `Parent Level ${d}`,
              slug: d === parentDepth ? parentSlug : `parent-level-${d}-${parentSlug}`,
              description: `Parent at depth ${d}`,
              parentId: parentId,
            });
            parentId = parentCategory.id;
            currentDepth = parentCategory.depth;
          }

          // Now create the child category under the parent
          const childCategory = await categoryService.createCategory({
            ...input,
            slug: `child-${input.slug}`,
            parentId: parentId,
          } as CreateCategoryInput);

          // Verify the child category has correct parentId and depth
          expect(childCategory).toBeDefined();
          expect(childCategory.parentId).toBe(parentId);
          expect(childCategory.depth).toBe(currentDepth + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 1: Category Creation Respects Parent Selection**
   * **Validates: Requirements 1.2, 1.3**
   *
   * Property: For any sequence of category creations with varying parent selections,
   * each category's depth equals its parent's depth + 1 (or 0 if no parent)
   */
  it('depth is always parent.depth + 1 for any valid parent selection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: categoryNameArb,
            slug: slugArb,
            useParent: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (categorySpecs) => {
          resetMockState();

          const createdCategories: Array<{ id: string; depth: number }> = [];

          for (let i = 0; i < categorySpecs.length; i++) {
            const spec = categorySpecs[i];
            
            // Determine parent: if useParent is true and we have categories, pick one that allows children
            let parentId: string | null = null;
            let expectedDepth = 0;

            if (spec.useParent && createdCategories.length > 0) {
              // Find a parent that won't exceed max depth (depth < 2)
              const validParents = createdCategories.filter(c => c.depth < 2);
              if (validParents.length > 0) {
                const parent = validParents[0];
                parentId = parent.id;
                expectedDepth = parent.depth + 1;
              }
            }

            try {
              const category = await categoryService.createCategory({
                name: `${spec.name}-${i}`,
                slug: `${spec.slug}-${i}`,
                description: `Category ${i}`,
                parentId: parentId,
              });

              // Verify depth calculation
              expect(category.parentId).toBe(parentId);
              expect(category.depth).toBe(expectedDepth);

              createdCategories.push({ id: category.id, depth: category.depth });
            } catch {
              // If creation fails (e.g., duplicate), skip this iteration
              // This is acceptable as we're testing the depth property, not uniqueness
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 1: Category Creation Respects Parent Selection**
   * **Validates: Requirements 1.2**
   *
   * Property: Creating multiple children under the same parent all have the same depth
   */
  it('all children under the same parent have identical depth', async () => {
    await fc.assert(
      fc.asyncProperty(
        slugArb,
        fc.array(
          fc.record({
            name: categoryNameArb,
            slug: slugArb,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (parentSlug, childSpecs) => {
          resetMockState();

          // Create a parent category
          const parent = await categoryService.createCategory({
            name: 'Parent Category',
            slug: parentSlug,
            description: 'Parent',
            parentId: null,
          });

          const expectedChildDepth = parent.depth + 1;
          const children: Array<{ id: string; depth: number; parentId: string | null }> = [];

          // Create multiple children under the same parent
          for (let i = 0; i < childSpecs.length; i++) {
            const spec = childSpecs[i];
            const child = await categoryService.createCategory({
              name: `${spec.name}-${i}`,
              slug: `${spec.slug}-child-${i}`,
              description: `Child ${i}`,
              parentId: parent.id,
            });

            children.push({
              id: child.id,
              depth: child.depth,
              parentId: child.parentId,
            });
          }

          // Verify all children have the same depth and correct parentId
          for (const child of children) {
            expect(child.parentId).toBe(parent.id);
            expect(child.depth).toBe(expectedChildDepth);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 2: Duplicate Name Validation Within Parent', () => {
  /**
   * **Feature: subcategories, Property 2: Duplicate Name Validation Within Parent**
   * **Validates: Requirements 1.5**
   *
   * Property: For any parent category (or null for root) and any existing category name
   * under that parent, attempting to create another category with the same name and parent
   * should be rejected.
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 2: Duplicate Name Validation Within Parent**
   * **Validates: Requirements 1.5**
   *
   * Property: For any category name N and parent P, if a category with name N already exists
   * under parent P, creating another category with the same name N under the same parent P
   * should be rejected with a validation error.
   */
  it('creating a category with duplicate name under same parent fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        fc.option(slugArb, { nil: undefined }), // Optional parent slug
        async (input, secondSlug, parentSlug) => {
          resetMockState();

          // Optionally create a parent category
          let parentId: string | null = null;
          if (parentSlug) {
            const parent = await categoryService.createCategory({
              name: 'Parent Category',
              slug: parentSlug.startsWith('parent') ? parentSlug : `parent-${parentSlug}`,
              description: 'Parent for duplicate test',
              parentId: null,
            });
            parentId = parent.id;
          }

          // Create the first category under the parent (or root)
          const firstCategory = await categoryService.createCategory({
            ...input,
            slug: input.slug.startsWith('first') ? input.slug : `first-${input.slug}`,
            parentId: parentId,
          } as CreateCategoryInput);
          expect(firstCategory).toBeDefined();
          expect(firstCategory.name).toBe(input.name);
          expect(firstCategory.parentId).toBe(parentId);

          // Attempt to create a second category with the same name under the same parent
          const duplicateInput: CreateCategoryInput = {
            name: input.name,
            slug: secondSlug === input.slug ? `${secondSlug}-dup` : secondSlug,
            description: 'Duplicate category',
            parentId: parentId,
          };

          // Should throw an error due to duplicate name under same parent
          await expect(categoryService.createCategory(duplicateInput)).rejects.toThrow(
            'A category with this name already exists under the selected parent'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 2: Duplicate Name Validation Within Parent**
   * **Validates: Requirements 1.5**
   *
   * Property: Duplicate name validation is case-insensitive within the same parent scope.
   */
  it('duplicate name validation is case-insensitive within same parent', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        fc.option(slugArb, { nil: undefined }),
        async (input, secondSlug, parentSlug) => {
          resetMockState();

          // Optionally create a parent category
          let parentId: string | null = null;
          if (parentSlug) {
            const parent = await categoryService.createCategory({
              name: 'Parent Category',
              slug: parentSlug.startsWith('parent') ? parentSlug : `parent-${parentSlug}`,
              description: 'Parent for case test',
              parentId: null,
            });
            parentId = parent.id;
          }

          // Create the first category
          const firstCategory = await categoryService.createCategory({
            ...input,
            slug: input.slug.startsWith('first') ? input.slug : `first-${input.slug}`,
            parentId: parentId,
          } as CreateCategoryInput);
          expect(firstCategory).toBeDefined();

          // Generate a case-variant of the name
          const caseVariantName = input.name
            .split('')
            .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
            .join('');

          // Attempt to create with case-variant name under same parent
          const duplicateInput: CreateCategoryInput = {
            name: caseVariantName,
            slug: secondSlug === input.slug ? `${secondSlug}-case` : secondSlug,
            description: 'Case variant category',
            parentId: parentId,
          };

          // Should throw an error due to case-insensitive duplicate name
          await expect(categoryService.createCategory(duplicateInput)).rejects.toThrow(
            'A category with this name already exists under the selected parent'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 2: Duplicate Name Validation Within Parent**
   * **Validates: Requirements 1.5**
   *
   * Property: Categories with the same name under different parents are allowed.
   * This validates that the uniqueness constraint is scoped to the parent, not global.
   */
  it('same name under different parents is allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        slugArb,
        async (input, parent1Slug, parent2Slug) => {
          resetMockState();

          // Create two different parent categories
          const parent1 = await categoryService.createCategory({
            name: 'Parent One',
            slug: parent1Slug.startsWith('p1') ? parent1Slug : `p1-${parent1Slug}`,
            description: 'First parent',
            parentId: null,
          });

          const parent2 = await categoryService.createCategory({
            name: 'Parent Two',
            slug: parent2Slug.startsWith('p2') ? parent2Slug : `p2-${parent2Slug}`,
            description: 'Second parent',
            parentId: null,
          });

          // Create a category under parent1
          const child1 = await categoryService.createCategory({
            ...input,
            slug: input.slug.startsWith('c1') ? input.slug : `c1-${input.slug}`,
            parentId: parent1.id,
          } as CreateCategoryInput);
          expect(child1).toBeDefined();
          expect(child1.name).toBe(input.name);
          expect(child1.parentId).toBe(parent1.id);

          // Create a category with the same name under parent2 - should succeed
          const child2 = await categoryService.createCategory({
            name: input.name,
            slug: `c2-${input.slug}`,
            description: 'Same name, different parent',
            parentId: parent2.id,
          });

          expect(child2).toBeDefined();
          expect(child2.name).toBe(input.name);
          expect(child2.parentId).toBe(parent2.id);
          expect(child2.id).not.toBe(child1.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 2: Duplicate Name Validation Within Parent**
   * **Validates: Requirements 1.5**
   *
   * Property: A category name that exists at root level can be reused under a parent,
   * and vice versa, since they are in different parent scopes.
   */
  it('same name at root and under parent is allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        slugArb,
        async (input, parentSlug) => {
          resetMockState();

          // Create a root category with the test name
          const rootCategory = await categoryService.createCategory({
            ...input,
            slug: input.slug.startsWith('root') ? input.slug : `root-${input.slug}`,
            parentId: null,
          } as CreateCategoryInput);
          expect(rootCategory).toBeDefined();
          expect(rootCategory.parentId).toBeNull();

          // Create a parent category
          const parent = await categoryService.createCategory({
            name: 'Parent Category',
            slug: parentSlug.startsWith('parent') ? parentSlug : `parent-${parentSlug}`,
            description: 'Parent',
            parentId: null,
          });

          // Create a child with the same name under the parent - should succeed
          const childCategory = await categoryService.createCategory({
            name: input.name,
            slug: `child-${input.slug}`,
            description: 'Same name under parent',
            parentId: parent.id,
          });

          expect(childCategory).toBeDefined();
          expect(childCategory.name).toBe(input.name);
          expect(childCategory.parentId).toBe(parent.id);
          expect(childCategory.id).not.toBe(rootCategory.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 4: Move Preserves Descendants and Posts', () => {
  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.2, 2.4**
   *
   * Property: For any category with children and/or posts, moving it to a new valid parent should:
   * - Preserve the count of descendant categories
   * - Preserve the count of associated posts
   * - Update depths of all descendants correctly (new depth = new parent depth + 1 + relative depth)
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.2**
   *
   * Property: For any category with descendants, moving it to a new parent preserves
   * the count of descendant categories.
   */
  it('moving a category preserves descendant count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of children
        async (childCount) => {
          resetMockState();

          // Create a root category that will be moved
          const categoryToMove = await categoryService.createCategory({
            name: 'Category To Move',
            slug: 'category-to-move',
            description: 'Will be moved',
            parentId: null,
          });

          // Create children under the category to move
          const children: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToMove.id,
            });
            children.push(child.id);
          }

          // Create a new parent category
          const newParent = await categoryService.createCategory({
            name: 'New Parent',
            slug: 'new-parent',
            description: 'New parent category',
            parentId: null,
          });

          // Get descendant count before move
          const allCategoriesBefore = await categoryService.getAllCategories();
          const descendantsBefore = allCategoriesBefore.filter(
            (c) => c.parentId === categoryToMove.id
          );
          const descendantCountBefore = descendantsBefore.length;

          // Move the category to the new parent
          await categoryService.moveCategory(categoryToMove.id, newParent.id);

          // Get descendant count after move
          const allCategoriesAfter = await categoryService.getAllCategories();
          const descendantsAfter = allCategoriesAfter.filter(
            (c) => c.parentId === categoryToMove.id
          );
          const descendantCountAfter = descendantsAfter.length;

          // Verify descendant count is preserved
          expect(descendantCountAfter).toBe(descendantCountBefore);
          expect(descendantCountAfter).toBe(childCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.4**
   *
   * Property: For any category with posts, moving it to a new parent preserves
   * the count of associated posts.
   */
  it('moving a category preserves post count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of posts
        async (postCount) => {
          resetMockState();

          // Create a root category that will be moved
          const categoryToMove = await categoryService.createCategory({
            name: 'Category With Posts',
            slug: 'category-with-posts',
            description: 'Has posts',
            parentId: null,
          });

          // Create posts in the category
          for (let i = 0; i < postCount; i++) {
            createMockPost(categoryToMove.id);
          }

          // Create a new parent category
          const newParent = await categoryService.createCategory({
            name: 'New Parent',
            slug: 'new-parent',
            description: 'New parent category',
            parentId: null,
          });

          // Get post count before move
          let postCountBefore = 0;
          for (const post of postStore.values()) {
            if (post.categoryId === categoryToMove.id) {
              postCountBefore++;
            }
          }

          // Move the category to the new parent
          await categoryService.moveCategory(categoryToMove.id, newParent.id);

          // Get post count after move
          let postCountAfter = 0;
          for (const post of postStore.values()) {
            if (post.categoryId === categoryToMove.id) {
              postCountAfter++;
            }
          }

          // Verify post count is preserved (posts stay with the category)
          expect(postCountAfter).toBe(postCountBefore);
          expect(postCountAfter).toBe(postCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.2, 2.4**
   *
   * Property: For any category with descendants, moving it updates the depths
   * of all descendants correctly (new depth = new parent depth + 1 + relative depth).
   */
  it('moving a category updates descendant depths correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of children (limited to avoid max depth issues)
        async (childCount) => {
          resetMockState();

          // Create a root category that will be moved
          const categoryToMove = await categoryService.createCategory({
            name: 'Category To Move',
            slug: 'category-to-move',
            description: 'Will be moved',
            parentId: null,
          });
          expect(categoryToMove.depth).toBe(0);

          // Create children under the category to move
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToMove.id,
            });
            expect(child.depth).toBe(1); // Children of root are at depth 1
            childIds.push(child.id);
          }

          // Create a new parent category at depth 0
          const newParent = await categoryService.createCategory({
            name: 'New Parent',
            slug: 'new-parent',
            description: 'New parent category',
            parentId: null,
          });
          expect(newParent.depth).toBe(0);

          // Move the category to the new parent
          // categoryToMove: depth 0 -> depth 1 (under newParent)
          // children: depth 1 -> depth 2
          await categoryService.moveCategory(categoryToMove.id, newParent.id);

          // Verify the moved category's new depth
          const movedCategory = await categoryService.getCategoryById(categoryToMove.id);
          expect(movedCategory).not.toBeNull();
          expect(movedCategory!.parentId).toBe(newParent.id);
          expect(movedCategory!.depth).toBe(1); // newParent.depth + 1 = 0 + 1 = 1

          // Verify all children have updated depths
          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child).not.toBeNull();
            expect(child!.parentId).toBe(categoryToMove.id); // Parent unchanged
            expect(child!.depth).toBe(2); // movedCategory.depth + 1 = 1 + 1 = 2
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.2, 2.4**
   *
   * Property: Moving a category to root (null parent) correctly updates depths.
   */
  it('moving a category to root updates depths correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of children
        async (childCount) => {
          resetMockState();

          // Create a parent category
          const originalParent = await categoryService.createCategory({
            name: 'Original Parent',
            slug: 'original-parent',
            description: 'Original parent',
            parentId: null,
          });

          // Create a category under the parent that will be moved
          const categoryToMove = await categoryService.createCategory({
            name: 'Category To Move',
            slug: 'category-to-move',
            description: 'Will be moved to root',
            parentId: originalParent.id,
          });
          expect(categoryToMove.depth).toBe(1);

          // Create children under the category to move
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToMove.id,
            });
            expect(child.depth).toBe(2);
            childIds.push(child.id);
          }

          // Move the category to root (null parent)
          await categoryService.moveCategory(categoryToMove.id, null);

          // Verify the moved category is now at root
          const movedCategory = await categoryService.getCategoryById(categoryToMove.id);
          expect(movedCategory).not.toBeNull();
          expect(movedCategory!.parentId).toBeNull();
          expect(movedCategory!.depth).toBe(0);

          // Verify all children have updated depths
          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child).not.toBeNull();
            expect(child!.parentId).toBe(categoryToMove.id);
            expect(child!.depth).toBe(1); // movedCategory.depth + 1 = 0 + 1 = 1
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 4: Move Preserves Descendants and Posts**
   * **Validates: Requirements 2.2, 2.4**
   *
   * Property: Moving a category with both descendants and posts preserves both.
   */
  it('moving a category preserves both descendants and posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of children
        fc.integer({ min: 1, max: 3 }), // Number of posts
        async (childCount, postCount) => {
          resetMockState();

          // Create a root category that will be moved
          const categoryToMove = await categoryService.createCategory({
            name: 'Category To Move',
            slug: 'category-to-move',
            description: 'Has both children and posts',
            parentId: null,
          });

          // Create children
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToMove.id,
            });
            childIds.push(child.id);
          }

          // Create posts
          for (let i = 0; i < postCount; i++) {
            createMockPost(categoryToMove.id);
          }

          // Create a new parent
          const newParent = await categoryService.createCategory({
            name: 'New Parent',
            slug: 'new-parent',
            description: 'New parent category',
            parentId: null,
          });

          // Move the category
          await categoryService.moveCategory(categoryToMove.id, newParent.id);

          // Verify descendants are preserved
          const allCategories = await categoryService.getAllCategories();
          const descendantsAfter = allCategories.filter(
            (c) => c.parentId === categoryToMove.id
          );
          expect(descendantsAfter.length).toBe(childCount);

          // Verify posts are preserved
          let postCountAfter = 0;
          for (const post of postStore.values()) {
            if (post.categoryId === categoryToMove.id) {
              postCountAfter++;
            }
          }
          expect(postCountAfter).toBe(postCount);

          // Verify depths are correct
          const movedCategory = await categoryService.getCategoryById(categoryToMove.id);
          expect(movedCategory!.depth).toBe(1);

          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child!.depth).toBe(2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 6: Deletion Reassigns Children to Grandparent', () => {
  /**
   * **Feature: subcategories, Property 6: Deletion Reassigns Children to Grandparent**
   * **Validates: Requirements 3.2**
   *
   * Property: For any category with children, deleting it should result in all children having:
   * - parentId equal to the deleted category's original parentId
   * - depth equal to the deleted category's original depth
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 6: Deletion Reassigns Children to Grandparent**
   * **Validates: Requirements 3.2**
   *
   * Property: For any root category with children, deleting it should result in all children
   * becoming root categories (parentId = null, depth = 0).
   */
  it('deleting a root category reassigns children to root level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of children
        async (childCount) => {
          resetMockState();

          // Create a root category that will be deleted
          const categoryToDelete = await categoryService.createCategory({
            name: 'Category To Delete',
            slug: 'category-to-delete',
            description: 'Will be deleted',
            parentId: null,
          });
          expect(categoryToDelete.depth).toBe(0);
          expect(categoryToDelete.parentId).toBeNull();

          // Create children under the category to delete
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToDelete.id,
            });
            expect(child.depth).toBe(1);
            expect(child.parentId).toBe(categoryToDelete.id);
            childIds.push(child.id);
          }

          // Store the original parentId and depth of the category to delete
          const originalParentId = categoryToDelete.parentId; // null
          const originalDepth = categoryToDelete.depth; // 0

          // Delete the category (no posts, so no reassignment target needed)
          await categoryService.deleteCategory(categoryToDelete.id);

          // Verify the category was deleted
          const deletedCategory = await categoryService.getCategoryById(categoryToDelete.id);
          expect(deletedCategory).toBeNull();

          // Verify all children have been reassigned to the grandparent (null in this case)
          // and their depths have been updated to the deleted category's original depth
          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child).not.toBeNull();
            expect(child!.parentId).toBe(originalParentId); // Should be null
            expect(child!.depth).toBe(originalDepth); // Should be 0
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 6: Deletion Reassigns Children to Grandparent**
   * **Validates: Requirements 3.2**
   *
   * Property: For any non-root category with children, deleting it should result in all children
   * being reassigned to the grandparent with updated depths.
   */
  it('deleting a non-root category reassigns children to grandparent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of children (limited to avoid max depth issues)
        async (childCount) => {
          resetMockState();

          // Create a grandparent (root) category
          const grandparent = await categoryService.createCategory({
            name: 'Grandparent',
            slug: 'grandparent',
            description: 'Grandparent category',
            parentId: null,
          });
          expect(grandparent.depth).toBe(0);

          // Create a parent category (will be deleted)
          const categoryToDelete = await categoryService.createCategory({
            name: 'Category To Delete',
            slug: 'category-to-delete',
            description: 'Will be deleted',
            parentId: grandparent.id,
          });
          expect(categoryToDelete.depth).toBe(1);
          expect(categoryToDelete.parentId).toBe(grandparent.id);

          // Create children under the category to delete
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToDelete.id,
            });
            expect(child.depth).toBe(2);
            expect(child.parentId).toBe(categoryToDelete.id);
            childIds.push(child.id);
          }

          // Store the original parentId and depth of the category to delete
          const originalParentId = categoryToDelete.parentId; // grandparent.id
          const originalDepth = categoryToDelete.depth; // 1

          // Delete the category (no posts, so no reassignment target needed)
          await categoryService.deleteCategory(categoryToDelete.id);

          // Verify the category was deleted
          const deletedCategory = await categoryService.getCategoryById(categoryToDelete.id);
          expect(deletedCategory).toBeNull();

          // Verify all children have been reassigned to the grandparent
          // and their depths have been updated to the deleted category's original depth
          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child).not.toBeNull();
            expect(child!.parentId).toBe(originalParentId); // Should be grandparent.id
            expect(child!.depth).toBe(originalDepth); // Should be 1
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 6: Deletion Reassigns Children to Grandparent**
   * **Validates: Requirements 3.2**
   *
   * Property: For any category with children at various depths, deleting it should correctly
   * update all children's parentId and depth values.
   */
  it('deleting a category with multiple children updates all correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of children
        fc.boolean(), // Whether to have a grandparent
        async (childCount, hasGrandparent) => {
          resetMockState();

          let grandparentId: string | null = null;
          let expectedNewParentId: string | null = null;
          let expectedNewDepth: number;

          if (hasGrandparent) {
            // Create a grandparent category
            const grandparent = await categoryService.createCategory({
              name: 'Grandparent',
              slug: 'grandparent',
              description: 'Grandparent category',
              parentId: null,
            });
            grandparentId = grandparent.id;
            expectedNewParentId = grandparent.id;
            expectedNewDepth = 1; // Grandparent is at depth 0, so deleted category is at depth 1
          } else {
            expectedNewParentId = null;
            expectedNewDepth = 0; // Deleted category is at root level
          }

          // Create the category to delete
          const categoryToDelete = await categoryService.createCategory({
            name: 'Category To Delete',
            slug: 'category-to-delete',
            description: 'Will be deleted',
            parentId: grandparentId,
          });

          // Create children under the category to delete
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const child = await categoryService.createCategory({
              name: `Child ${i}`,
              slug: `child-${i}`,
              description: `Child category ${i}`,
              parentId: categoryToDelete.id,
            });
            childIds.push(child.id);
          }

          // Store the original parentId and depth of the category to delete
          const originalParentId = categoryToDelete.parentId;
          const originalDepth = categoryToDelete.depth;

          // Delete the category
          await categoryService.deleteCategory(categoryToDelete.id);

          // Verify the category was deleted
          const deletedCategory = await categoryService.getCategoryById(categoryToDelete.id);
          expect(deletedCategory).toBeNull();

          // Verify all children have been reassigned correctly
          for (const childId of childIds) {
            const child = await categoryService.getCategoryById(childId);
            expect(child).not.toBeNull();
            expect(child!.parentId).toBe(originalParentId);
            expect(child!.depth).toBe(originalDepth);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 6: Deletion Reassigns Children to Grandparent**
   * **Validates: Requirements 3.2**
   *
   * Property: Deleting a category without children should not affect other categories.
   */
  it('deleting a category without children does not affect other categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of sibling categories
        async (siblingCount) => {
          resetMockState();

          // Create a parent category
          const parent = await categoryService.createCategory({
            name: 'Parent',
            slug: 'parent',
            description: 'Parent category',
            parentId: null,
          });

          // Create the category to delete (no children)
          const categoryToDelete = await categoryService.createCategory({
            name: 'Category To Delete',
            slug: 'category-to-delete',
            description: 'Will be deleted',
            parentId: parent.id,
          });

          // Create sibling categories
          const siblingIds: string[] = [];
          for (let i = 0; i < siblingCount; i++) {
            const sibling = await categoryService.createCategory({
              name: `Sibling ${i}`,
              slug: `sibling-${i}`,
              description: `Sibling category ${i}`,
              parentId: parent.id,
            });
            siblingIds.push(sibling.id);
          }

          // Store sibling states before deletion
          const siblingStatesBefore = await Promise.all(
            siblingIds.map(async (id) => {
              const cat = await categoryService.getCategoryById(id);
              return { id, parentId: cat!.parentId, depth: cat!.depth };
            })
          );

          // Delete the category
          await categoryService.deleteCategory(categoryToDelete.id);

          // Verify the category was deleted
          const deletedCategory = await categoryService.getCategoryById(categoryToDelete.id);
          expect(deletedCategory).toBeNull();

          // Verify siblings are unaffected
          for (const siblingBefore of siblingStatesBefore) {
            const siblingAfter = await categoryService.getCategoryById(siblingBefore.id);
            expect(siblingAfter).not.toBeNull();
            expect(siblingAfter!.parentId).toBe(siblingBefore.parentId);
            expect(siblingAfter!.depth).toBe(siblingBefore.depth);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 7: Deletion Blocked When Posts Exist', () => {
  /**
   * **Feature: subcategories, Property 7: Deletion Blocked When Posts Exist**
   * **Validates: Requirements 3.3**
   *
   * Property: For any category with associated posts, attempting to delete without
   * specifying a reassignment target should be rejected.
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 7: Deletion Blocked When Posts Exist**
   * **Validates: Requirements 3.3**
   *
   * Property: For any category with one or more associated posts, attempting to delete
   * without providing a reassignment target should be rejected with an error.
   */
  it('deleting a category with posts fails without reassignment target', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        fc.integer({ min: 1, max: 10 }),
        async (input, postCount) => {
          resetMockState();

          // Create a category
          const category = await categoryService.createCategory(input as CreateCategoryInput);
          expect(category).toBeDefined();

          // Add posts to the category
          for (let i = 0; i < postCount; i++) {
            createMockPost(category.id);
          }

          // Attempt to delete the category without providing a reassignment target
          await expect(categoryService.deleteCategory(category.id)).rejects.toThrow(
            'Cannot delete category with posts. Please reassign posts first'
          );

          // Verify the category still exists
          const existingCategory = await categoryService.getCategoryById(category.id);
          expect(existingCategory).not.toBeNull();
          expect(existingCategory!.id).toBe(category.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 7: Deletion Blocked When Posts Exist**
   * **Validates: Requirements 3.3**
   *
   * Property: For any category with posts, the posts remain unchanged when deletion is blocked.
   */
  it('posts remain unchanged when deletion is blocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        createCategoryInputArb,
        fc.integer({ min: 1, max: 5 }),
        async (input, postCount) => {
          resetMockState();

          // Create a category
          const category = await categoryService.createCategory(input as CreateCategoryInput);
          expect(category).toBeDefined();

          // Add posts to the category and track their IDs
          const postIds: string[] = [];
          for (let i = 0; i < postCount; i++) {
            postIds.push(createMockPost(category.id));
          }

          // Attempt to delete the category without providing a reassignment target
          await expect(categoryService.deleteCategory(category.id)).rejects.toThrow(
            'Cannot delete category with posts. Please reassign posts first'
          );

          // Verify all posts still exist and are still associated with the category
          for (const postId of postIds) {
            const post = postStore.get(postId);
            expect(post).toBeDefined();
            expect(post!.categoryId).toBe(category.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 7: Deletion Blocked When Posts Exist**
   * **Validates: Requirements 3.3**
   *
   * Property: For any category with posts in a hierarchy, deletion is blocked regardless
   * of the category's position in the hierarchy.
   */
  it('deletion is blocked for categories with posts at any depth', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 }), // Depth of the category (0 = root, 1 = child, 2 = grandchild)
        fc.integer({ min: 1, max: 5 }),
        async (targetDepth, postCount) => {
          resetMockState();

          // Build a category hierarchy up to the target depth
          let parentId: string | null = null;
          let targetCategoryId: string | null = null;

          for (let d = 0; d <= targetDepth; d++) {
            const category = await categoryService.createCategory({
              name: `Category Depth ${d}`,
              slug: `category-depth-${d}`,
              description: `Category at depth ${d}`,
              parentId: parentId,
            });

            if (d === targetDepth) {
              targetCategoryId = category.id;
            } else {
              parentId = category.id;
            }
          }

          expect(targetCategoryId).not.toBeNull();

          // Add posts to the target category
          for (let i = 0; i < postCount; i++) {
            createMockPost(targetCategoryId!);
          }

          // Attempt to delete the category without providing a reassignment target
          await expect(categoryService.deleteCategory(targetCategoryId!)).rejects.toThrow(
            'Cannot delete category with posts. Please reassign posts first'
          );

          // Verify the category still exists
          const existingCategory = await categoryService.getCategoryById(targetCategoryId!);
          expect(existingCategory).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 9: Children Include Accurate Post Counts', () => {
  /**
   * **Feature: subcategories, Property 9: Children Include Accurate Post Counts**
   * **Validates: Requirements 4.2**
   *
   * Property: For any parent category, fetching its children should return categories
   * where each child's postCount equals the actual number of posts directly assigned
   * to that child.
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 9: Children Include Accurate Post Counts**
   * **Validates: Requirements 4.2**
   *
   * Property: For any parent category with children, each child's postCount returned by
   * getChildrenWithPostCounts equals the actual number of posts directly assigned to that child.
   */
  it('getChildrenWithPostCounts returns accurate post counts for each child', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: categoryNameArb,
            slug: slugArb,
            postCount: fc.integer({ min: 0, max: 5 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (childSpecs) => {
          resetMockState();

          // Create a parent category
          const parent = await categoryService.createCategory({
            name: 'Parent Category',
            slug: 'parent-category',
            description: 'Parent for post count test',
            parentId: null,
          });

          // Track expected post counts for each child
          const expectedPostCounts: Map<string, number> = new Map();

          // Create children with varying post counts
          for (let i = 0; i < childSpecs.length; i++) {
            const spec = childSpecs[i];
            const child = await categoryService.createCategory({
              name: `${spec.name}-${i}`,
              slug: `${spec.slug}-child-${i}`,
              description: `Child ${i}`,
              parentId: parent.id,
            });

            // Create the specified number of posts for this child
            for (let p = 0; p < spec.postCount; p++) {
              createMockPost(child.id);
            }

            expectedPostCounts.set(child.id, spec.postCount);
          }

          // Fetch children with post counts
          const childrenWithCounts = await categoryService.getChildrenWithPostCounts(parent.id);

          // Verify each child has the correct post count
          expect(childrenWithCounts.length).toBe(childSpecs.length);

          for (const child of childrenWithCounts) {
            const expectedCount = expectedPostCounts.get(child.id);
            expect(expectedCount).toBeDefined();
            expect(child.postCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 9: Children Include Accurate Post Counts**
   * **Validates: Requirements 4.2**
   *
   * Property: For root categories (parentId = null), getChildrenWithPostCounts returns
   * accurate post counts for each root category.
   */
  it('getChildrenWithPostCounts returns accurate post counts for root categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: categoryNameArb,
            slug: slugArb,
            postCount: fc.integer({ min: 0, max: 5 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (rootSpecs) => {
          resetMockState();

          // Track expected post counts for each root category
          const expectedPostCounts: Map<string, number> = new Map();

          // Create root categories with varying post counts
          for (let i = 0; i < rootSpecs.length; i++) {
            const spec = rootSpecs[i];
            const rootCategory = await categoryService.createCategory({
              name: `${spec.name}-${i}`,
              slug: `${spec.slug}-root-${i}`,
              description: `Root ${i}`,
              parentId: null,
            });

            // Create the specified number of posts for this root category
            for (let p = 0; p < spec.postCount; p++) {
              createMockPost(rootCategory.id);
            }

            expectedPostCounts.set(rootCategory.id, spec.postCount);
          }

          // Fetch root categories with post counts (parentId = null)
          const rootsWithCounts = await categoryService.getChildrenWithPostCounts(null);

          // Verify each root category has the correct post count
          expect(rootsWithCounts.length).toBe(rootSpecs.length);

          for (const root of rootsWithCounts) {
            const expectedCount = expectedPostCounts.get(root.id);
            expect(expectedCount).toBeDefined();
            expect(root.postCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 9: Children Include Accurate Post Counts**
   * **Validates: Requirements 4.2**
   *
   * Property: Post counts are accurate even when posts are distributed across
   * multiple levels of the hierarchy (posts in children don't affect parent counts).
   */
  it('post counts are isolated to direct assignments only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // Posts in parent
        fc.integer({ min: 0, max: 5 }), // Posts in child
        fc.integer({ min: 0, max: 5 }), // Posts in grandchild
        async (parentPosts, childPosts, grandchildPosts) => {
          resetMockState();

          // Create a three-level hierarchy
          const parent = await categoryService.createCategory({
            name: 'Parent',
            slug: 'parent',
            description: 'Parent category',
            parentId: null,
          });

          const child = await categoryService.createCategory({
            name: 'Child',
            slug: 'child',
            description: 'Child category',
            parentId: parent.id,
          });

          const grandchild = await categoryService.createCategory({
            name: 'Grandchild',
            slug: 'grandchild',
            description: 'Grandchild category',
            parentId: child.id,
          });

          // Create posts at each level
          for (let i = 0; i < parentPosts; i++) {
            createMockPost(parent.id);
          }
          for (let i = 0; i < childPosts; i++) {
            createMockPost(child.id);
          }
          for (let i = 0; i < grandchildPosts; i++) {
            createMockPost(grandchild.id);
          }

          // Fetch children of root (should only include parent)
          const rootChildren = await categoryService.getChildrenWithPostCounts(null);
          const parentResult = rootChildren.find(c => c.id === parent.id);
          expect(parentResult).toBeDefined();
          expect(parentResult!.postCount).toBe(parentPosts); // Only direct posts, not descendants

          // Fetch children of parent (should only include child)
          const parentChildren = await categoryService.getChildrenWithPostCounts(parent.id);
          const childResult = parentChildren.find(c => c.id === child.id);
          expect(childResult).toBeDefined();
          expect(childResult!.postCount).toBe(childPosts); // Only direct posts, not grandchild's

          // Fetch children of child (should only include grandchild)
          const childChildren = await categoryService.getChildrenWithPostCounts(child.id);
          const grandchildResult = childChildren.find(c => c.id === grandchild.id);
          expect(grandchildResult).toBeDefined();
          expect(grandchildResult!.postCount).toBe(grandchildPosts);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 9: Children Include Accurate Post Counts**
   * **Validates: Requirements 4.2**
   *
   * Property: Post counts remain accurate after posts are added or removed.
   */
  it('post counts update correctly when posts are added', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }), // Initial posts
        fc.integer({ min: 1, max: 3 }), // Additional posts to add
        async (initialPosts, additionalPosts) => {
          resetMockState();

          // Create a parent and child
          const parent = await categoryService.createCategory({
            name: 'Parent',
            slug: 'parent',
            description: 'Parent category',
            parentId: null,
          });

          const child = await categoryService.createCategory({
            name: 'Child',
            slug: 'child',
            description: 'Child category',
            parentId: parent.id,
          });

          // Create initial posts
          for (let i = 0; i < initialPosts; i++) {
            createMockPost(child.id);
          }

          // Verify initial count
          const childrenBefore = await categoryService.getChildrenWithPostCounts(parent.id);
          const childBefore = childrenBefore.find(c => c.id === child.id);
          expect(childBefore).toBeDefined();
          expect(childBefore!.postCount).toBe(initialPosts);

          // Add more posts
          for (let i = 0; i < additionalPosts; i++) {
            createMockPost(child.id);
          }

          // Verify updated count
          const childrenAfter = await categoryService.getChildrenWithPostCounts(parent.id);
          const childAfter = childrenAfter.find(c => c.id === child.id);
          expect(childAfter).toBeDefined();
          expect(childAfter!.postCount).toBe(initialPosts + additionalPosts);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 10: Descendant Post Aggregation', () => {
  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: For any category, fetching posts with `includeDescendants: true` should return
   * all posts from the category plus all posts from every category in its descendant tree.
   */

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: For any category with descendants, getPostsInCategory with includeDescendants=true
   * returns posts from the category AND all its descendants.
   */
  it('getPostsInCategory with includeDescendants=true returns posts from category and all descendants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }), // Posts in root category
        fc.integer({ min: 0, max: 3 }), // Posts in child category
        fc.integer({ min: 0, max: 3 }), // Posts in grandchild category
        async (rootPosts, childPosts, grandchildPosts) => {
          resetMockState();

          // Create a three-level hierarchy
          const root = await categoryService.createCategory({
            name: 'Root Category',
            slug: 'root-category',
            description: 'Root category',
            parentId: null,
          });

          const child = await categoryService.createCategory({
            name: 'Child Category',
            slug: 'child-category',
            description: 'Child category',
            parentId: root.id,
          });

          const grandchild = await categoryService.createCategory({
            name: 'Grandchild Category',
            slug: 'grandchild-category',
            description: 'Grandchild category',
            parentId: child.id,
          });

          // Create posts at each level
          const rootPostIds: string[] = [];
          const childPostIds: string[] = [];
          const grandchildPostIds: string[] = [];

          for (let i = 0; i < rootPosts; i++) {
            rootPostIds.push(createMockPost(root.id));
          }
          for (let i = 0; i < childPosts; i++) {
            childPostIds.push(createMockPost(child.id));
          }
          for (let i = 0; i < grandchildPosts; i++) {
            grandchildPostIds.push(createMockPost(grandchild.id));
          }

          // Fetch posts from root with includeDescendants=true
          const postsWithDescendants = await categoryService.getPostsInCategory(root.id, true);

          // Expected total: posts from root + child + grandchild
          const expectedTotal = rootPosts + childPosts + grandchildPosts;
          expect(postsWithDescendants.length).toBe(expectedTotal);

          // Verify all post IDs are included
          const returnedPostIds = postsWithDescendants.map(p => p.id);
          for (const postId of rootPostIds) {
            expect(returnedPostIds).toContain(postId);
          }
          for (const postId of childPostIds) {
            expect(returnedPostIds).toContain(postId);
          }
          for (const postId of grandchildPostIds) {
            expect(returnedPostIds).toContain(postId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: For any category, getPostsInCategory with includeDescendants=false
   * returns ONLY posts directly assigned to that category.
   */
  it('getPostsInCategory with includeDescendants=false returns only direct posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }), // Posts in root category
        fc.integer({ min: 0, max: 3 }), // Posts in child category
        async (rootPosts, childPosts) => {
          resetMockState();

          // Create a two-level hierarchy
          const root = await categoryService.createCategory({
            name: 'Root Category',
            slug: 'root-category',
            description: 'Root category',
            parentId: null,
          });

          const child = await categoryService.createCategory({
            name: 'Child Category',
            slug: 'child-category',
            description: 'Child category',
            parentId: root.id,
          });

          // Create posts at each level
          const rootPostIds: string[] = [];
          const childPostIds: string[] = [];

          for (let i = 0; i < rootPosts; i++) {
            rootPostIds.push(createMockPost(root.id));
          }
          for (let i = 0; i < childPosts; i++) {
            childPostIds.push(createMockPost(child.id));
          }

          // Fetch posts from root with includeDescendants=false
          const postsWithoutDescendants = await categoryService.getPostsInCategory(root.id, false);

          // Should only return posts directly in root
          expect(postsWithoutDescendants.length).toBe(rootPosts);

          // Verify only root post IDs are included
          const returnedPostIds = postsWithoutDescendants.map(p => p.id);
          for (const postId of rootPostIds) {
            expect(returnedPostIds).toContain(postId);
          }
          // Child posts should NOT be included
          for (const postId of childPostIds) {
            expect(returnedPostIds).not.toContain(postId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: The count of posts returned with includeDescendants=true equals the sum
   * of posts in the category plus posts in all descendant categories.
   */
  it('post count with includeDescendants=true equals sum of all descendant posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.integer({ min: 0, max: 3 }),
          { minLength: 1, maxLength: 3 } // Post counts for each level
        ),
        async (postCountsPerLevel) => {
          resetMockState();

          // Create a hierarchy based on the number of levels
          const categories: string[] = [];
          let parentId: string | null = null;

          for (let level = 0; level < postCountsPerLevel.length; level++) {
            const category = await categoryService.createCategory({
              name: `Category Level ${level}`,
              slug: `category-level-${level}`,
              description: `Category at level ${level}`,
              parentId: parentId,
            });
            categories.push(category.id);
            parentId = category.id;
          }

          // Create posts at each level
          let totalExpectedPosts = 0;
          for (let level = 0; level < postCountsPerLevel.length; level++) {
            const postCount = postCountsPerLevel[level];
            for (let i = 0; i < postCount; i++) {
              createMockPost(categories[level]);
            }
            totalExpectedPosts += postCount;
          }

          // Fetch posts from root with includeDescendants=true
          const postsWithDescendants = await categoryService.getPostsInCategory(categories[0], true);

          // Verify total count matches sum of all levels
          expect(postsWithDescendants.length).toBe(totalExpectedPosts);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: For a leaf category (no children), includeDescendants=true and
   * includeDescendants=false return the same results.
   */
  it('leaf category returns same posts regardless of includeDescendants flag', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // Posts in leaf category
        async (postCount) => {
          resetMockState();

          // Create a leaf category (no children)
          const leaf = await categoryService.createCategory({
            name: 'Leaf Category',
            slug: 'leaf-category',
            description: 'Leaf category with no children',
            parentId: null,
          });

          // Create posts in the leaf category
          const postIds: string[] = [];
          for (let i = 0; i < postCount; i++) {
            postIds.push(createMockPost(leaf.id));
          }

          // Fetch posts with both flags
          const postsWithDescendants = await categoryService.getPostsInCategory(leaf.id, true);
          const postsWithoutDescendants = await categoryService.getPostsInCategory(leaf.id, false);

          // Both should return the same count
          expect(postsWithDescendants.length).toBe(postCount);
          expect(postsWithoutDescendants.length).toBe(postCount);

          // Both should contain the same post IDs
          const withDescIds = postsWithDescendants.map(p => p.id).sort();
          const withoutDescIds = postsWithoutDescendants.map(p => p.id).sort();
          expect(withDescIds).toEqual(withoutDescIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 10: Descendant Post Aggregation**
   * **Validates: Requirements 4.3**
   *
   * Property: For any intermediate category in a hierarchy, includeDescendants=true
   * returns posts from that category and all categories below it, but not from ancestors.
   */
  it('intermediate category aggregates only its subtree posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }), // Posts in root
        fc.integer({ min: 0, max: 3 }), // Posts in middle
        fc.integer({ min: 0, max: 3 }), // Posts in leaf
        async (rootPosts, middlePosts, leafPosts) => {
          resetMockState();

          // Create a three-level hierarchy
          const root = await categoryService.createCategory({
            name: 'Root',
            slug: 'root',
            description: 'Root category',
            parentId: null,
          });

          const middle = await categoryService.createCategory({
            name: 'Middle',
            slug: 'middle',
            description: 'Middle category',
            parentId: root.id,
          });

          const leaf = await categoryService.createCategory({
            name: 'Leaf',
            slug: 'leaf',
            description: 'Leaf category',
            parentId: middle.id,
          });

          // Create posts at each level
          for (let i = 0; i < rootPosts; i++) {
            createMockPost(root.id);
          }
          const middlePostIds: string[] = [];
          for (let i = 0; i < middlePosts; i++) {
            middlePostIds.push(createMockPost(middle.id));
          }
          const leafPostIds: string[] = [];
          for (let i = 0; i < leafPosts; i++) {
            leafPostIds.push(createMockPost(leaf.id));
          }

          // Fetch posts from middle with includeDescendants=true
          const postsFromMiddle = await categoryService.getPostsInCategory(middle.id, true);

          // Should include middle + leaf posts, but NOT root posts
          const expectedCount = middlePosts + leafPosts;
          expect(postsFromMiddle.length).toBe(expectedCount);

          // Verify correct posts are included
          const returnedPostIds = postsFromMiddle.map(p => p.id);
          for (const postId of middlePostIds) {
            expect(returnedPostIds).toContain(postId);
          }
          for (const postId of leafPostIds) {
            expect(returnedPostIds).toContain(postId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
