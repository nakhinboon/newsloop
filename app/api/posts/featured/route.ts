import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';
import type { Prisma } from '@/lib/generated/prisma';

export const dynamic = 'force-dynamic';

// Post include for all queries
const postInclude = {
  author: { select: { firstName: true, lastName: true, imageUrl: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  postMedia: {
    include: { media: { select: { url: true, thumbnailUrl: true } } },
    orderBy: { order: 'asc' as const },
  },
  _count: { select: { pageViews: true } },
};

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/**
 * Transform post to API response format
 */
function transformPost(post: PostWithRelations) {
  return {
    id: post.id,
    slug: post.slug,
    locale: post.locale,
    title: post.title,
    excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 160),
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    featured: post.featured,
    viewCount: post._count.pageViews,
    author: {
      name: [post.author.firstName, post.author.lastName].filter(Boolean).join(' ') || 'Anonymous',
      avatar: post.author.imageUrl,
    },
    category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
    tags: post.tags.map(pt => ({ name: pt.tag.name, slug: pt.tag.slug })),
    image: post.postMedia.find(pm => pm.isCover)?.media?.url || post.postMedia[0]?.media?.url || null,
  };
}

/**
 * GET /api/posts/featured - Get posts for BBC-style homepage
 * 
 * หลักการ:
 * - Hero: featured posts หรือ latest ถ้าไม่มี featured
 * - Top Stories: breaking news (tag) หรือ latest 24h
 * - More News: latest posts ทั่วไป
 * - Must Read: popular (by views) หรือ featured
 * - Feature: long reads (readingTime > 5) หรือ analysis category
 * - Video: posts with video tag
 * - Bottom Grid: latest from different categories
 * 
 * ยืดหยุ่น: ถ้าไม่มีข้อมูลตาม criteria จะ fallback ไป latest
 */
export async function GET() {
  try {
    const cacheKey = 'posts:homepage:all';
    
    // Try cache first
    const cached = await postCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Base where clause - ไม่ filter locale, แสดงทุกภาษารวมกัน
    const baseWhere: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    };

    // Fetch different post types in parallel
    const [
      featuredPosts,
      latestPosts,
      popularPosts,
      breakingPosts,
      longReadPosts,
      videoPosts,
    ] = await Promise.all([
      // Featured posts
      prisma.post.findMany({
        where: { ...baseWhere, featured: true },
        include: postInclude,
        orderBy: { publishedAt: 'desc' },
        take: 10,
      }),
      // Latest posts
      prisma.post.findMany({
        where: baseWhere,
        include: postInclude,
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
      // Popular posts (by view count)
      prisma.post.findMany({
        where: baseWhere,
        include: postInclude,
        orderBy: { pageViews: { _count: 'desc' } },
        take: 10,
      }),
      // Breaking news (posts from last 24h or with breaking tag)
      prisma.post.findMany({
        where: {
          ...baseWhere,
          OR: [
            { publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { tags: { some: { tag: { slug: 'breaking' } } } },
          ],
        },
        include: postInclude,
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
      // Long reads (readingTime > 5 minutes)
      prisma.post.findMany({
        where: { ...baseWhere, readingTime: { gte: 5 } },
        include: postInclude,
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
      // Video posts (with video tag)
      prisma.post.findMany({
        where: {
          ...baseWhere,
          tags: { some: { tag: { slug: 'video' } } },
        },
        include: postInclude,
        orderBy: { publishedAt: 'desc' },
        take: 3,
      }),
    ]);

    // Track used post IDs to avoid duplicates
    const usedIds = new Set<string>();

    /**
     * Get unique posts from multiple sources with fallback
     * priority: array of source names in order of preference
     */
    function getUniquePosts(
      count: number,
      priority: string[],
      sources: Record<string, PostWithRelations[]>
    ) {
      const result: ReturnType<typeof transformPost>[] = [];
      
      for (const sourceName of priority) {
        const sourceData = sources[sourceName] || [];
        for (const post of sourceData) {
          if (!usedIds.has(post.id) && result.length < count) {
            usedIds.add(post.id);
            result.push(transformPost(post));
          }
        }
        if (result.length >= count) break;
      }
      
      // Fallback to latest if not enough
      if (result.length < count) {
        for (const post of latestPosts) {
          if (!usedIds.has(post.id) && result.length < count) {
            usedIds.add(post.id);
            result.push(transformPost(post));
          }
        }
      }
      
      return result;
    }

    // Source mapping
    const sources: Record<string, PostWithRelations[]> = {
      featured: featuredPosts,
      latest: latestPosts,
      popular: popularPosts,
      breaking: breakingPosts,
      longRead: longReadPosts,
      video: videoPosts,
    };

    // Build response sections
    const heroMain = getUniquePosts(1, ['featured', 'latest'], sources)[0] || null;
    const heroSide = getUniquePosts(4, ['featured', 'latest'], sources);
    const topStories = getUniquePosts(3, ['breaking', 'latest'], sources);
    const moreNews = getUniquePosts(4, ['latest'], sources);
    const mustRead = getUniquePosts(5, ['popular', 'featured', 'latest'], sources);
    const featureMain = getUniquePosts(1, ['longRead', 'featured', 'latest'], sources)[0] || null;
    const featureSide = getUniquePosts(1, ['longRead', 'latest'], sources)[0] || null;
    const videoSection = getUniquePosts(1, ['video', 'latest'], sources)[0] || null;
    const bottomGrid = getUniquePosts(8, ['latest'], sources);

    const response = {
      hero: { main: heroMain, side: heroSide },
      topStories,
      moreNews,
      mustRead,
      feature: { main: featureMain, side: featureSide },
      video: videoSection,
      bottomGrid,
      // Meta info for debugging/admin
      meta: {
        totalFeatured: featuredPosts.length,
        totalLatest: latestPosts.length,
        totalPopular: popularPosts.length,
        totalBreaking: breakingPosts.length,
        totalLongRead: longReadPosts.length,
        totalVideo: videoPosts.length,
      },
    };

    // Cache for 5 minutes
    await postCache.set(cacheKey, response, 300);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching homepage posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
