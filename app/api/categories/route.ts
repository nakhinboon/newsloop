import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories - Get all categories with post counts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withPosts = searchParams.get('withPosts') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    const rootOnly = searchParams.get('rootOnly') !== 'false';
    const cacheKey = `categories:public:${withPosts}:${limit}:${rootOnly}`;
    
    const cached = await postCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const categories = await prisma.category.findMany({
      where: rootOnly ? { parentId: null } : undefined,
      include: {
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
        ...(withPosts && {
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
        }),
      },
      orderBy: { name: 'asc' },
    });

    const transformedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      postCount: cat._count.posts,
      ...(withPosts && {
        posts: cat.posts?.map((post) => ({
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
      }),
    }));

    await postCache.set(cacheKey, transformedCategories, 300);

    return NextResponse.json(transformedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
