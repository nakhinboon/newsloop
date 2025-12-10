import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';
import type { Category } from '@/lib/generated/prisma';
import type { Post } from '@/lib/types';
import { MAX_CATEGORY_DEPTH, validateNoCycle } from '@/lib/categories/validation';
import { getDescendants, getAncestors, buildCategoryTree, CategoryNode } from '@/lib/categories/tree';

// Re-export CategoryNode for consumers of this module
export type { CategoryNode } from '@/lib/categories/tree';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
}

export interface CategoryWithCount extends Category {
  _count: { posts: number };
}

/**
 * Category Service - CRUD operations for categories
 */
export const categoryService = {
  /**
   * Get all categories with post counts
   */
  async getAllCategories(): Promise<CategoryWithCount[]> {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: string): Promise<CategoryWithCount | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  },

  /**
   * Get a category by slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryWithCount | null> {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  },

  /**
   * Get a category by slug with its complete ancestor chain
   * 
   * Returns an array of categories from root to the specified category,
   * useful for breadcrumb navigation.
   * 
   * @param slug - The slug of the category
   * @returns Array of CategoryNode objects ordered from root to the category itself, or null if not found
   * 
   * Requirements: 4.1
   */
  async getCategoryWithAncestorsBySlug(slug: string): Promise<CategoryNode[] | null> {
    // Find the category by slug first
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return null;
    }

    // Use the existing getCategoryWithAncestors method
    return this.getCategoryWithAncestors(category.id);
  },

  /**
   * Create a new category with optional parent for hierarchical structure
   * 
   * @param data - Category creation data including optional parentId
   * @returns The created category
   * @throws Error if depth exceeds maximum, name is duplicate within parent, or parent doesn't exist
   */
  async createCategory(data: CreateCategoryInput): Promise<Category> {
    const parentId = data.parentId ?? null;
    let depth = 0;

    // If parentId is provided, validate parent exists and calculate depth
    if (parentId !== null) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true, depth: true },
      });

      if (!parent) {
        throw new Error('Selected parent category does not exist');
      }

      depth = parent.depth + 1;

      // Validate depth doesn't exceed maximum (2)
      if (depth > MAX_CATEGORY_DEPTH) {
        throw new Error(`Cannot create subcategory: maximum nesting depth (${MAX_CATEGORY_DEPTH + 1} levels) reached`);
      }
    }

    // Check for duplicate name within the same parent scope
    const existingWithSameName = await prisma.category.findFirst({
      where: {
        parentId: parentId,
        name: { equals: data.name, mode: 'insensitive' },
      },
    });

    if (existingWithSameName) {
      throw new Error('A category with this name already exists under the selected parent');
    }

    // Check for duplicate slug (globally unique)
    const existingWithSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingWithSlug) {
      throw new Error('A category with this slug already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: parentId,
        depth: depth,
      },
    });

    // Invalidate cache
    await postCache.invalidateCategories();

    return category;
  },

  /**
   * Update a category
   */
  async updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
    // Check for duplicate name/slug (excluding current category)
    if (data.name || data.slug) {
      const existing = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: { equals: data.name, mode: 'insensitive' as const } }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
      });

      if (existing) {
        throw new Error('Category with this name or slug already exists');
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await postCache.invalidateCategories();
    await postCache.invalidateAllPosts();

    return category;
  },

  /**
   * Delete a category with optional post reassignment
   * 
   * When deleting a category:
   * - If the category has posts, a reassignment target must be provided
   * - Children are reassigned to the deleted category's parent (or become root if no parent)
   * - Depths of reassigned children are updated accordingly
   * 
   * @param id - The ID of the category to delete
   * @param reassignPostsTo - Optional ID of category to reassign posts to (required if category has posts)
   * @throws Error if category has posts and no reassignment target is provided
   * @throws Error if reassignment target doesn't exist
   * 
   * Requirements: 3.2, 3.3
   */
  async deleteCategory(id: string, reassignPostsTo?: string): Promise<void> {
    // Fetch the category to delete with its current state
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        parentId: true,
        depth: true,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has posts
    const postCount = await prisma.post.count({
      where: { categoryId: id },
    });

    // If category has posts, require reassignment target
    if (postCount > 0) {
      if (!reassignPostsTo) {
        throw new Error('Cannot delete category with posts. Please reassign posts first');
      }

      // Validate reassignment target exists
      const targetCategory = await prisma.category.findUnique({
        where: { id: reassignPostsTo },
        select: { id: true },
      });

      if (!targetCategory) {
        throw new Error('Reassignment target category does not exist');
      }
    }

    // Get direct children of the category being deleted
    const children = await prisma.category.findMany({
      where: { parentId: id },
      select: { id: true, depth: true },
    });

    // Calculate new depth for children (they will be moved to deleted category's parent)
    // If deleted category was at depth N, children were at depth N+1
    // After reassignment to deleted category's parent, children will be at depth N
    const newChildDepth = category.depth;

    // Perform deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // Reassign posts if needed
      if (postCount > 0 && reassignPostsTo) {
        await tx.post.updateMany({
          where: { categoryId: id },
          data: { categoryId: reassignPostsTo },
        });
      }

      // Reassign children to deleted category's parent and update their depths
      if (children.length > 0) {
        for (const child of children) {
          await tx.category.update({
            where: { id: child.id },
            data: {
              parentId: category.parentId, // Move to grandparent (or null if deleted was root)
              depth: newChildDepth,
            },
          });
        }
      }

      // Delete the category
      await tx.category.delete({ where: { id } });
    });

    // Invalidate cache
    await postCache.invalidateCategories();
    await postCache.invalidateAllPosts();
  },

  /**
   * Move a category to a new parent
   * 
   * Implements parent change with cycle detection, updates depths of moved category
   * and all descendants, and preserves all children and post associations.
   * 
   * @param id - The ID of the category to move
   * @param newParentId - The ID of the new parent category, or null to make it a root category
   * @returns The updated category
   * @throws Error if category doesn't exist, new parent doesn't exist, cycle would be created, or depth would exceed maximum
   * 
   * Requirements: 2.2, 2.3, 2.4
   */
  async moveCategory(id: string, newParentId: string | null): Promise<Category> {
    // Fetch the category to move
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // If newParentId is the same as current parentId, no change needed
    if (category.parentId === newParentId) {
      return category;
    }

    // Fetch all categories for validation
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        depth: true,
      },
    });

    // Convert to CategoryNode array for validation functions
    const categoryNodes: CategoryNode[] = allCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      depth: c.depth,
    }));

    // Validate new parent exists (if provided)
    let newParentDepth = -1;
    if (newParentId !== null) {
      const newParent = allCategories.find(c => c.id === newParentId);
      if (!newParent) {
        throw new Error('Selected parent category does not exist');
      }
      newParentDepth = newParent.depth;

      // Validate no cycle would be created
      if (!validateNoCycle(id, newParentId, categoryNodes)) {
        throw new Error('Cannot move category: would create circular reference');
      }
    }

    // Calculate new depth for the moved category
    const newDepth = newParentId === null ? 0 : newParentDepth + 1;

    // Get all descendants to check depth constraints and update their depths
    const descendants = getDescendants(id, categoryNodes);
    
    // Calculate depth change
    const depthChange = newDepth - category.depth;

    // Check if any descendant would exceed max depth after move
    for (const descendant of descendants) {
      const newDescendantDepth = descendant.depth + depthChange;
      if (newDescendantDepth > MAX_CATEGORY_DEPTH) {
        throw new Error(`Cannot move category: maximum nesting depth (${MAX_CATEGORY_DEPTH + 1} levels) would be exceeded`);
      }
    }

    // Check if the moved category itself would exceed max depth
    if (newDepth > MAX_CATEGORY_DEPTH) {
      throw new Error(`Cannot move category: maximum nesting depth (${MAX_CATEGORY_DEPTH + 1} levels) would be exceeded`);
    }

    // Check for duplicate name within the new parent scope
    const existingWithSameName = await prisma.category.findFirst({
      where: {
        parentId: newParentId,
        name: { equals: category.name, mode: 'insensitive' },
        id: { not: id }, // Exclude the category being moved
      },
    });

    if (existingWithSameName) {
      throw new Error('A category with this name already exists under the selected parent');
    }

    // Perform the move in a transaction
    const updatedCategory = await prisma.$transaction(async (tx) => {
      // Update the moved category
      const updated = await tx.category.update({
        where: { id },
        data: {
          parentId: newParentId,
          depth: newDepth,
        },
      });

      // Update depths of all descendants
      if (descendants.length > 0 && depthChange !== 0) {
        for (const descendant of descendants) {
          await tx.category.update({
            where: { id: descendant.id },
            data: {
              depth: descendant.depth + depthChange,
            },
          });
        }
      }

      return updated;
    });

    // Invalidate cache
    await postCache.invalidateCategories();
    await postCache.invalidateAllPosts();

    return updatedCategory;
  },

  /**
   * Get all categories as a hierarchical tree structure
   * 
   * Fetches all categories from the database and builds a tree structure
   * where root categories are at the top level and children are nested.
   * 
   * @returns Array of root CategoryNode objects with nested children
   * 
   * Requirements: 4.4
   */
  async getCategoryTree(): Promise<CategoryNode[]> {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
    });

    // Convert to CategoryNode array
    const categoryNodes: CategoryNode[] = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      depth: c.depth,
      postCount: c._count.posts,
    }));

    return buildCategoryTree(categoryNodes);
  },

  /**
   * Get a category with its complete ancestor chain
   * 
   * Returns an array of categories from root to the specified category,
   * useful for breadcrumb navigation.
   * 
   * @param id - The ID of the category
   * @returns Array of CategoryNode objects ordered from root to the category itself
   * @throws Error if category doesn't exist
   * 
   * Requirements: 4.1
   */
  async getCategoryWithAncestors(id: string): Promise<CategoryNode[]> {
    // Fetch all categories for ancestor traversal
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    // Convert to CategoryNode array
    const categoryNodes: CategoryNode[] = allCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      depth: c.depth,
      postCount: c._count.posts,
    }));

    // Find the target category
    const targetCategory = categoryNodes.find(c => c.id === id);
    if (!targetCategory) {
      throw new Error('Category not found');
    }

    // Get ancestors and append the target category
    const ancestors = getAncestors(id, categoryNodes);
    return [...ancestors, targetCategory];
  },

  /**
   * Get a category with all its descendants as a tree
   * 
   * Returns the specified category with all children, grandchildren, etc.
   * nested in a tree structure.
   * 
   * @param id - The ID of the category
   * @returns CategoryNode with nested children
   * @throws Error if category doesn't exist
   * 
   * Requirements: 4.4
   */
  async getCategoryWithDescendants(id: string): Promise<CategoryNode> {
    // Fetch all categories
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    // Convert to CategoryNode array
    const categoryNodes: CategoryNode[] = allCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      depth: c.depth,
      postCount: c._count.posts,
    }));

    // Find the target category
    const targetCategory = categoryNodes.find(c => c.id === id);
    if (!targetCategory) {
      throw new Error('Category not found');
    }

    // Get all descendants
    const descendants = getDescendants(id, categoryNodes);

    // Build a subtree with the target category as root
    // We need to include the target and all its descendants
    const subtreeCategories = [targetCategory, ...descendants];
    
    // Build tree from the subtree categories
    const tree = buildCategoryTree(subtreeCategories);
    
    // The target category should be the only root in this subtree
    // (since we're building from the target and its descendants only)
    const result = tree.find(node => node.id === id);
    
    if (!result) {
      // If not found in tree roots, return the target with empty children
      return { ...targetCategory, children: [] };
    }

    return result;
  },

  /**
   * Get direct children of a category with their post counts
   * 
   * Returns all categories that are direct children of the specified parent,
   * including accurate post counts for each child.
   * 
   * @param parentId - The ID of the parent category, or null for root categories
   * @returns Array of CategoryNode objects with postCount populated
   * 
   * Requirements: 4.2
   */
  async getChildrenWithPostCounts(parentId: string | null): Promise<CategoryNode[]> {
    const children = await prisma.category.findMany({
      where: { parentId: parentId },
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return children.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      depth: c.depth,
      postCount: c._count.posts,
    }));
  },

  /**
   * Get posts in a category, optionally including posts from all descendant categories
   * 
   * When includeDescendants is true, collects all descendant category IDs and
   * queries posts where categoryId is in the collected IDs.
   * 
   * @param categoryId - The ID of the category to get posts from
   * @param includeDescendants - Whether to include posts from descendant categories
   * @returns Array of posts from the category (and optionally descendants)
   * @throws Error if category doesn't exist
   * 
   * Requirements: 4.3
   */
  async getPostsInCategory(categoryId: string, includeDescendants: boolean = false): Promise<Post[]> {
    // Verify the category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Collect category IDs to query
    let categoryIds: string[] = [categoryId];

    if (includeDescendants) {
      // Fetch all categories to find descendants
      const allCategories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          parentId: true,
          depth: true,
        },
      });

      // Convert to CategoryNode array for getDescendants function
      const categoryNodes: CategoryNode[] = allCategories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        parentId: c.parentId,
        depth: c.depth,
      }));

      // Get all descendant categories
      const descendants = getDescendants(categoryId, categoryNodes);
      
      // Add descendant IDs to the list
      categoryIds = [categoryId, ...descendants.map(d => d.id)];
    }

    // Query posts where categoryId is in the collected IDs
    const posts = await prisma.post.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
      include: {
        author: true,
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    // Transform to Post type
    return posts.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      author: {
        name: post.author.firstName && post.author.lastName 
          ? `${post.author.firstName} ${post.author.lastName}` 
          : post.author.email,
        avatar: post.author.imageUrl || undefined,
      },
      publishedAt: post.publishedAt || post.createdAt,
      updatedAt: post.updatedAt,
      category: post.category?.name || '',
      tags: post.tags.map(pt => pt.tag.name),
      readingTime: post.readingTime,
      featured: post.featured,
      locale: post.locale,
      status: post.status.toLowerCase() as 'draft' | 'scheduled' | 'published',
    }));
  },

  /**
   * Get subcategories with their latest posts for grid display
   * Returns CategoryWithPosts format suitable for CategoryGridSection
   */
  async getChildrenWithPosts(parentId: string, limit: number = 3): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    postCount: number;
    posts: {
      id: string;
      slug: string;
      locale: string;
      title: string;
      excerpt: string;
      publishedAt: Date;
      readingTime: number;
      featured: boolean;
      author: { name: string; avatar: string | null };
      category: { name: string; slug: string } | null;
      image: string | null;
    }[];
  }[]> {
    const children = await prisma.category.findMany({
      where: { parentId },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: 'PUBLISHED' },
          take: limit,
          orderBy: { publishedAt: 'desc' },
          include: {
            author: true,
            category: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return children.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      postCount: c._count.posts,
      posts: c.posts.map(p => ({
        id: p.id,
        slug: p.slug,
        locale: p.locale,
        title: p.title,
        excerpt: p.excerpt || '',
        publishedAt: p.publishedAt || p.createdAt,
        readingTime: p.readingTime,
        featured: p.featured,
        author: {
          name: p.author.firstName && p.author.lastName
            ? `${p.author.firstName} ${p.author.lastName}`
            : p.author.email,
          avatar: p.author.imageUrl,
        },
        category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
        image: p.coverImage,
      })),
    }));
  },

  /**
   * Check if a category name is unique
   */
  async isNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !existing;
  },

  /**
   * Generate a slug from a name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};

export default categoryService;
