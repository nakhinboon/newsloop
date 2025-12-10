"use client";

import Link from "next/link";
import type { Post } from "@/lib/types";

export interface RelatedPostsProps {
  posts: Post[];
  locale?: string;
  title?: string;
}

/**
 * RelatedPosts component displays related posts at the end of a post page.
 * Requirements: 2.5
 */
export function RelatedPosts({
  posts,
  locale = "en",
  title = "Related Posts",
}: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {title}
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const formattedDate = new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }).format(post.publishedAt);

          return (
            <article
              key={post.slug}
              className="group rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <Link href={`/${locale}/blog/${post.slug}`} className="block">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {post.category}
                  </span>
                  <span>•</span>
                  <time dateTime={post.publishedAt.toISOString()}>
                    {formattedDate}
                  </time>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {post.excerpt}
                </p>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RelatedPosts;
