import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import cacheService, { CACHE_TTL } from '@/lib/cache/redis';
import type { Prisma } from '@/lib/generated/prisma';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/posts - Public API for fetching published posts
 * Query params:
 * - locale: Filter by locale (default: all)
 * - limit: Number of posts (default: 20, max: 50)
 * - offset: Pagination offset (default: 0)
 * - featured: Filter featured posts only
 * - category: Filter by category slug
 * - section: Get posts for specific homepage section
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const featured = searchParams.get('featured') === 'true';
    const categorySlug = searchParams.get('category');
    const section = searchParams.get('section');

    // Build cache key
    const cacheKey = `posts:public:${locale ?? 'all'}:${limit}:${offset}:${featured}:${categorySlug ?? 'all'}:${section ?? 'default'}`;
    
    // Try cache first
    const cached = await cacheService.get<PublicPostsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build where clause
    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    };

    if (locale) {
      where.locale = locale;
    }

    if (featured) {
      where.featured = true;
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    // Fetch posts with relations
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, imageUrl: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          postMedia: {
            where: { isCover: true },
            include: { media: { select: { url: true, thumbnailUrl: true } } },
            take: 1,
          },
        },
        orderBy: [
          { featured: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    // Transform to public format
    const transformedPosts = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      locale: post.locale,
      title: post.title,
      excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 160),
      publishedAt: post.publishedAt,
      readingTime: post.readingTime,
      featured: post.featured,
      author: {
        name: [post.author.firstName, post.author.lastName].filter(Boolean).join(' ') || 'Anonymous',
        avatar: post.author.imageUrl,
      },
      category: post.category ? {
        name: post.category.name,
        slug: post.category.slug,
      } : null,
      tags: post.tags.map((pt) => ({
        name: pt.tag.name,
        slug: pt.tag.slug,
      })),
      image: post.postMedia[0]?.media?.url || null,
      thumbnailUrl: post.postMedia[0]?.media?.thumbnailUrl || null,
    }));

    const response = {
      posts: transformedPosts,
      total,
      limit,
      offset,
      hasMore: offset + posts.length < total,
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, response, CACHE_TTL.POSTS_LIST);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// Response type for caching
interface PublicPostsResponse {
  posts: TransformedPost[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface TransformedPost {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  readingTime: number | null;
  featured: boolean;
  author: { name: string; avatar: string | null };
  category: { name: string; slug: string } | null;
  tags: { name: string; slug: string }[];
  image: string | null;
  thumbnailUrl: string | null;
}
