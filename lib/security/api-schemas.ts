/**
 * Zod Schema Validation for API Routes
 * Implements input validation for all API endpoints
 * Requirements: 8.1 - Data integrity through schema validation
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Pagination parameters with enforced limits
 * Requirements: 4.3 - Pagination limit enforcement
 */
export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 20;
export const DEFAULT_PAGE_SIZE = 20;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_PAGE_SIZE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Non-empty string schema (rejects empty and whitespace-only strings)
 */
export const nonEmptyStringSchema = z.string()
  .min(1, 'This field is required')
  .refine((val) => val.trim().length > 0, 'This field cannot be empty or whitespace only');

// ============================================================================
// User Management Schemas
// ============================================================================

/**
 * Role enum for user management
 */
export const roleSchema = z.enum(['ADMIN', 'EDITOR'], {
  message: 'Role must be ADMIN or EDITOR',
});

/**
 * Update user role request body
 */
export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ============================================================================
// Invitation Schemas
// ============================================================================

/**
 * Create invitation request body
 */
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: roleSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// ============================================================================
// Media Schemas
// ============================================================================

/**
 * Media list query parameters
 */
export const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  folderId: z.string().nullable().optional(),
});

export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

/**
 * Move media to folder request body
 */
export const moveMediaToFolderSchema = z.object({
  folderId: z.string().nullable(),
});

export type MoveMediaToFolderInput = z.infer<typeof moveMediaToFolderSchema>;

// ============================================================================
// Folder Schemas
// ============================================================================

/**
 * Create/Update folder request body
 */
export const folderSchema = z.object({
  name: nonEmptyStringSchema.max(100, 'Folder name must be 100 characters or less'),
});

export type FolderInput = z.infer<typeof folderSchema>;

// ============================================================================
// Post Media Schemas
// ============================================================================

/**
 * Single post media item
 */
export const postMediaItemSchema = z.object({
  mediaId: z.string().min(1, 'Media ID is required'),
  isCover: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
});

/**
 * Update post media request body (PUT)
 */
export const updatePostMediaSchema = z.object({
  media: z.array(postMediaItemSchema),
});

export type UpdatePostMediaInput = z.infer<typeof updatePostMediaSchema>;

/**
 * Add media to post request body (POST)
 */
export const addMediaToPostSchema = z.object({
  mediaId: nonEmptyStringSchema,
  isCover: z.boolean().default(false),
});

export type AddMediaToPostInput = z.infer<typeof addMediaToPostSchema>;

// ============================================================================
// Posts API Schemas (Public)
// ============================================================================

/**
 * Public posts list query parameters
 */
export const postsListQuerySchema = z.object({
  locale: z.string().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().nonnegative().default(0),
  featured: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  category: z.string().optional(),
  section: z.string().optional(),
});

export type PostsListQuery = z.infer<typeof postsListQuerySchema>;

// ============================================================================
// Admin Posts API Schemas
// ============================================================================

/**
 * Post status enum
 */
export const postStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED'], {
  message: 'Status must be DRAFT, SCHEDULED, or PUBLISHED',
});

/**
 * Supported locales
 */
export const localeSchema = z.enum(['en', 'es', 'fr', 'th'], {
  message: 'Locale must be en, es, fr, or th',
});

/**
 * Slug validation - alphanumeric with hyphens, no spaces
 */
export const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(200, 'Slug must be 200 characters or less')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only');

/**
 * Admin posts list query parameters
 */
export const adminPostsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  status: postStatusSchema.optional(),
  categoryId: z.string().optional(),
  locale: localeSchema.optional(),
  search: z.string().max(200).optional(),
});

export type AdminPostsListQuery = z.infer<typeof adminPostsListQuerySchema>;

/**
 * Create post request body
 * Requirements: 8.1 - Validate data structure using Zod schemas
 */
export const createPostSchema = z.object({
  title: nonEmptyStringSchema.max(500, 'Title must be 500 characters or less'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt must be 1000 characters or less').optional(),
  slug: slugSchema,
  locale: localeSchema,
  status: postStatusSchema.default('DRAFT'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  featured: z.boolean().default(false),
  readingTime: z.number().int().positive().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Update post request body
 * Requirements: 8.1 - Validate data structure using Zod schemas
 */
export const updatePostSchema = z.object({
  title: nonEmptyStringSchema.max(500, 'Title must be 500 characters or less').optional(),
  content: z.string().min(1, 'Content cannot be empty').optional(),
  excerpt: z.string().max(1000, 'Excerpt must be 1000 characters or less').optional(),
  slug: slugSchema.optional(),
  locale: localeSchema.optional(),
  status: postStatusSchema.optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().nullable().optional().transform(v => v ? new Date(v) : v === null ? null : undefined),
  featured: z.boolean().optional(),
  readingTime: z.number().int().positive().optional(),
});

export type UpdatePostSchemaInput = z.infer<typeof updatePostSchema>;

// ============================================================================
// Categories API Schemas
// ============================================================================

/**
 * Categories list query parameters
 */
export const categoriesListQuerySchema = z.object({
  withPosts: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(10),
  rootOnly: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
});

export type CategoriesListQuery = z.infer<typeof categoriesListQuerySchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: z.ZodIssue[];
}

/**
 * Validate request body against a Zod schema
 * Requirements: 8.1 - Validate data structure using Zod schemas
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(body);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: 'Validation failed',
    details: result.error.issues,
  };
}

/**
 * Validate query parameters against a Zod schema
 * Requirements: 8.1, 4.3 - Validate query params with pagination limits
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  // Convert URLSearchParams to object
  const params: Record<string, string | null> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: 'Invalid query parameters',
    details: result.error.issues,
  };
}

/**
 * Format validation errors for API response
 */
export function formatValidationError(result: ValidationResult<unknown>): {
  error: string;
  details?: Array<{ field: string; message: string }>;
} {
  if (!result.details) {
    return { error: result.error || 'Validation failed' };
  }
  
  return {
    error: result.error || 'Validation failed',
    details: result.details.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Enforce pagination limit on a value
 * Requirements: 4.3 - Pagination limit enforcement
 */
export function enforcePaginationLimit(
  requestedLimit: number,
  maxLimit: number = MAX_LIMIT
): number {
  return Math.min(Math.max(1, requestedLimit), maxLimit);
}
