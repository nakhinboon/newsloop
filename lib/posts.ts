import prisma from "@/lib/db/prisma";
import type { Post, PostPreview, Category, Tag, LocalizedPost } from "./types";
import type { Locale } from "./i18n/config";
import { defaultLocale } from "./i18n/config";
import type { Prisma } from "@/lib/generated/prisma";

// Include for post queries with relations
const postInclude = {
  author: { select: { firstName: true, lastName: true, imageUrl: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  postMedia: {
    include: { media: { select: { url: true, thumbnailUrl: true } } },
    orderBy: { order: "asc" as const },
  },
  _count: { select: { pageViews: true } },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/** Transform Prisma post to app Post type */
function transformPost(post: PostWithRelations): Post {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, "").slice(0, 160),
    author: {
      name: [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || "Anonymous",
      avatar: post.author.imageUrl || undefined,
    },
    publishedAt: post.publishedAt || post.createdAt,
    updatedAt: post.updatedAt,
    category: post.category?.name || "Uncategorized",
    tags: post.tags.map((pt) => pt.tag.name),
    readingTime: post.readingTime,
    featured: post.featured,
    image: post.postMedia.find((pm) => pm.isCover)?.media?.url || post.postMedia[0]?.media?.url,
    locale: post.locale,
    status: post.status.toLowerCase() as Post["status"],
  };
}

/** Transform to LocalizedPost with alternate locales */
async function transformToLocalizedPost(post: PostWithRelations): Promise<LocalizedPost> {
  const basePost = transformPost(post);
  const alternates = await prisma.post.findMany({
    where: { slug: post.slug, locale: { not: post.locale }, status: "PUBLISHED" },
    select: { locale: true, slug: true },
  });
  return {
    ...basePost,
    locale: post.locale as Locale,
    alternateLocales: alternates.map((a) => ({ locale: a.locale as Locale, slug: a.slug })),
  };
}

/** Calculates reading time based on word count */
export function calculateReadingTime(content: string): number {
  const plainText = content.replace(/<[^>]*>/g, "");
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Generates a URL-friendly slug from a title */
export function generateSlug(title: string): string {
  return title.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Creates an excerpt from HTML content */
export function createExcerpt(content: string, customExcerpt?: string): string {
  if (customExcerpt) return customExcerpt.slice(0, 160);
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}


/** Gets all published posts */
export async function getAllPosts(locale?: Locale): Promise<Post[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() }, ...(locale && { locale }) },
    include: postInclude,
    orderBy: { publishedAt: "desc" },
  });
  return posts.map(transformPost);
}

/** Gets a single post by slug */
export async function getPostBySlug(slug: string, locale?: Locale): Promise<Post | null> {
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() }, ...(locale && { locale }) },
    include: postInclude,
  });
  return post ? transformPost(post) : null;
}

/** Gets a post by slug and locale */
export async function getPostBySlugAndLocale(slug: string, locale: Locale): Promise<LocalizedPost | null> {
  const post = await prisma.post.findFirst({
    where: { slug, locale, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: postInclude,
  });
  return post ? transformToLocalizedPost(post) : null;
}

/** Gets all available locales for a given post slug */
export async function getAvailableLocales(slug: string): Promise<Locale[]> {
  const posts = await prisma.post.findMany({
    where: { slug, status: "PUBLISHED" },
    select: { locale: true },
  });
  return posts.map((p) => p.locale as Locale);
}

/** Gets a post with fallback to default locale */
export async function getFallbackPost(
  slug: string,
  preferredLocale: Locale
): Promise<{ post: LocalizedPost; isFallback: boolean } | null> {
  // Try preferred locale
  const localizedPost = await getPostBySlugAndLocale(slug, preferredLocale);
  if (localizedPost) return { post: localizedPost, isFallback: false };

  // Try default locale
  if (preferredLocale !== defaultLocale) {
    const fallbackPost = await getPostBySlugAndLocale(slug, defaultLocale);
    if (fallbackPost) return { post: { ...fallbackPost, locale: preferredLocale }, isFallback: true };
  }

  // Try any locale
  const anyPost = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: postInclude,
  });
  if (anyPost) {
    const transformed = await transformToLocalizedPost(anyPost);
    return { post: transformed, isFallback: true };
  }
  return null;
}

/** Gets all posts in a specific category */
export async function getPostsByCategory(categorySlug: string, locale?: Locale): Promise<Post[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() }, category: { slug: categorySlug }, ...(locale && { locale }) },
    include: postInclude,
    orderBy: { publishedAt: "desc" },
  });
  return posts.map(transformPost);
}

/** Gets all posts containing a specific tag */
export async function getPostsByTag(tagSlug: string, locale?: Locale): Promise<Post[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() }, tags: { some: { tag: { slug: tagSlug } } }, ...(locale && { locale }) },
    include: postInclude,
    orderBy: { publishedAt: "desc" },
  });
  return posts.map(transformPost);
}


/** Gets all unique categories with post counts */
export async function getAllCategories(): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { posts: { where: { status: "PUBLISHED", publishedAt: { lte: new Date() } } } } } },
    orderBy: { name: "asc" },
  });
  return categories.map((cat) => ({ name: cat.name, slug: cat.slug, postCount: cat._count.posts }));
}

/** Gets all unique tags with post counts */
export async function getAllTags(): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { posts: { where: { post: { status: "PUBLISHED", publishedAt: { lte: new Date() } } } } } } },
    orderBy: { name: "asc" },
  });
  return tags.map((tag) => ({ name: tag.name, slug: tag.slug, postCount: tag._count.posts }));
}

/** Gets related posts based on shared tags or category */
export async function getRelatedPosts(post: Post, limit: number = 3): Promise<Post[]> {
  const posts = await prisma.post.findMany({
    where: {
      id: { not: post.id },
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [{ category: { name: post.category } }, { tags: { some: { tag: { name: { in: post.tags } } } } }],
    },
    include: postInclude,
    orderBy: { publishedAt: "desc" },
    take: limit * 2,
  });

  const scored = posts.map((p) => {
    let score = 0;
    const transformed = transformPost(p);
    if (transformed.category === post.category) score += 2;
    for (const tag of transformed.tags) if (post.tags.includes(tag)) score += 1;
    return { post: transformed, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.post);
}

/** Converts a Post to a PostPreview */
export function toPostPreview(post: Post): PostPreview {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    author: post.author,
    publishedAt: post.publishedAt,
    category: post.category,
    readingTime: post.readingTime,
    image: post.image,
    featured: post.featured,
  };
}

/** Gets all posts as previews */
export async function getAllPostPreviews(locale?: Locale): Promise<PostPreview[]> {
  const posts = await getAllPosts(locale);
  return posts.map(toPostPreview);
}

/** Sorts posts by publishedAt date descending */
export function sortPostsByDateDescending<T extends { publishedAt: Date }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}