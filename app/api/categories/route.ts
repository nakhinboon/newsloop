import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';
import {
  categoriesListQuerySchema,
  validateQuery,
  formatValidationError,
  MAX_LIMIT,
} from '@/lib/security/api-schemas';
import { validateMethod } from '@/lib/security/headers';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/categories - Get all categories with post counts
 * Requirements: 4.3, 5.4, 8.1 - Pagination limit enforcement, method validation, Zod validation
 */
export async function GET(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters with Zod schema - Requirements: 8.1, 4.3
    const validation = validateQuery(searchParams, categoriesListQuerySchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { withPosts, limit: requestedLimit, rootOnly } = validation.data!;
    
    // Enforce pagination limit - Requirements: 4.3
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    
    const cacheKey = `categories:public:${withPosts}:${limit}:${rootOnly}`;
    
    const cached = await postCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let transformedCategories;

    if (withPosts) {
      const categories = await prisma.category.findMany({
        where: rootOnly ? { parentId: null } : undefined,
        include: {
          _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
          posts: {
            where: { status: 'PUBLISHED' },
            include: {
              author: { select: { firstName: true, lastName: true, imageUrl: true } },
              postMedia: {
                where: { isCover: true },
                include: { media: { select: { url: true, thumbnailUrl: true } } },
                take: 1,
              },
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
          },
        },
        orderBy: { name: 'asc' },
      });

      transformedCategories = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        postCount: cat._count.posts,
        posts: cat.posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          locale: post.locale,
          title: post.title,
          excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 120),
          publishedAt: post.publishedAt,
          readingTime: post.readingTime,
          author: {
            name: [post.author.firstName, post.author.lastName].filter(Boolean).join(' ') || 'Anonymous',
            avatar: post.author.imageUrl,
          },
          image: post.postMedia[0]?.media?.url || null,
        })),
      }));
    } else {
      const categories = await prisma.category.findMany({
        where: rootOnly ? { parentId: null } : undefined,
        include: {
          _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
        },
        orderBy: { name: 'asc' },
      });

      transformedCategories = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        postCount: cat._count.posts,
      }));
    }

    await postCache.set(cacheKey, transformedCategories, 300);

    return NextResponse.json(transformedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
