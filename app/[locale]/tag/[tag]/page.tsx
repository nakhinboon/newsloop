import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/translations";
import {
  getPostsByTag,
  getAllCategories,
  getAllTags,
  toPostPreview,
} from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { CategoryList } from "@/components/CategoryList";
import { TagList } from "@/components/TagList";
import { generateTagMetadata } from "@/lib/seo";

interface TagPageProps {
  params: Promise<{ locale: string; tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

const POSTS_PER_PAGE = 9;

/**
 * Generate static params for all tags in all locales.
 * Returns empty array if database unavailable - pages will be generated on-demand.
 */
export async function generateStaticParams() {
  try {
    const tags = await getAllTags();
    return tags.map((tag) => ({
      tag: tag.slug,
    }));
  } catch {
    return [];
  }
}

/**
 * Generate metadata for the tag page.
 * Requirements: 6.1
 */
export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { locale, tag } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const decodedTag = decodeURIComponent(tag);
  const tagPosts = await getPostsByTag(decodedTag);

  return generateTagMetadata(decodedTag, locale as Locale, tagPosts.length);
}

/**
 * Tag filter page showing posts with a specific tag.
 * Requirements: 3.2
 */
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { locale, tag } = await params;
  const { page } = await searchParams;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const decodedTag = decodeURIComponent(tag);
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  // Fetch posts with this tag
  const tagPosts = await getPostsByTag(decodedTag);
  const postPreviews = tagPosts.map(toPostPreview);

  // Calculate pagination
  const totalPages = Math.ceil(postPreviews.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = postPreviews.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE
  );

  // Fetch categories and tags for sidebar
  const categories = await getAllCategories();
  const tags = await getAllTags();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link
            href={`/${validLocale}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {t("blog.allPosts", validLocale)}
          </Link>
          <span>/</span>
          <span>{t("blog.filterByTag", validLocale)}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          #{decodedTag}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("search.results", validLocale, { count: postPreviews.length })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <div className="sticky top-24 space-y-6">
            {/* Categories */}
            <CategoryList categories={categories} locale={validLocale} />

            {/* Tags */}
            <TagList
              tags={tags}
              activeTag={decodedTag}
              locale={validLocale}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {paginatedPosts.length > 0 ? (
            <PostList
              posts={paginatedPosts}
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={`/${validLocale}/tag/${tag}`}
              locale={validLocale}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t("blog.noPostsFound", validLocale)}
              </p>
              <Link
                href={`/${validLocale}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← {t("blog.allPosts", validLocale)}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
