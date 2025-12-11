import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/translations";
import { getFallbackPost, getRelatedPosts, getAllPosts } from "@/lib/posts";
import { PostHeader } from "@/components/PostHeader";
import { PostContent } from "@/components/PostContent";
import { RelatedPosts } from "@/components/RelatedPosts";
import { PostTags } from "@/components/PostTags";
import { LocaleFallbackNotice } from "@/components/LocaleFallbackNotice";
import { PageViewTracker } from "@/components/PageViewTracker";
import { generatePostMetadata } from "@/lib/seo";
import { ArticleJsonLd } from "@/components/JsonLd";
import Image from "next/image";

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Generate static params for all posts in all locales.
 */
export async function generateStaticParams() {
  const posts = await getAllPosts();
  const params: { locale: string; slug: string }[] = [];

  for (const post of posts) {
    // Generate params for default locale
    params.push({ locale: defaultLocale, slug: post.slug });
  }

  return params;
}

/**
 * Generate metadata for the blog post page.
 * Requirements: 6.1
 */
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const result = await getFallbackPost(slug, locale as Locale);

  if (!result) {
    return { title: "Not Found" };
  }

  const { post } = result;

  return generatePostMetadata(post, locale as Locale);
}

/**
 * Blog post page with full content, header, and related posts.
 * Handles locale fallback with notice.
 * Requirements: 2.1, 2.2, 2.5, 9.4, 9.5
 */
export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const result = await getFallbackPost(slug, validLocale);

  if (!result) {
    notFound();
  }

  const { post, isFallback } = result;
  const relatedPosts = await getRelatedPosts(post, 3);

  return (
    <>
      {/* JSON-LD Structured Data - Requirements: 6.2 */}
      <ArticleJsonLd post={post} locale={validLocale} />

      {/* Track page view */}
      <PageViewTracker postId={post.id} />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fallback Notice */}
        {isFallback && (
          <LocaleFallbackNotice
            requestedLocale={validLocale}
            fallbackLocale={defaultLocale}
          />
        )}

        {/* Post Header */}
        <PostHeader post={post} locale={validLocale} />

        {/* Post Image */}
        {post.image && (
          <div className="mb-8 relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            {/* Caption placeholder if needed */}
            {/* <figcaption className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs">
              {post.title}
            </figcaption> */}
          </div>
        )}

        {/* Post Content */}
        <div className="mt-8">
          <PostContent content={post.content} />
        </div>

        {/* Post Tags */}
        <PostTags tags={post.tags} locale={validLocale} />

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <RelatedPosts
            posts={relatedPosts}
            locale={validLocale}
            title={t("blog.relatedPosts", validLocale)}
          />
        )}
      </article>
    </>
  );
}
