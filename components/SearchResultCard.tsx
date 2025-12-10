"use client";

import Link from "next/link";
import Image from "next/image";
import type { SearchResult } from "@/lib/types";

export interface SearchResultCardProps {
  result: SearchResult;
  locale?: string;
}

/**
 * SearchResultCard component displays a search result with highlighted matches.
 * Requirements: 4.2
 */
export function SearchResultCard({
  result,
  locale = "en",
}: SearchResultCardProps) {
  const { post, matchedIn, highlightedTitle, highlightedExcerpt } = result;

  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(post.publishedAt);

  return (
    <article className="group rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <Link href={`/${locale}/blog/${post.slug}`} className="block">
        {/* Meta info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {post.category}
          </span>
          <span>•</span>
          <time dateTime={post.publishedAt.toISOString()}>{formattedDate}</time>
          <span>•</span>
          <span>{post.readingTime} min read</span>
        </div>

        {/* Title with highlighting */}
        <h2
          className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800 [&_mark]:px-0.5 [&_mark]:rounded"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />

        {/* Excerpt with highlighting */}
        <p
          className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800 [&_mark]:px-0.5 [&_mark]:rounded"
          dangerouslySetInnerHTML={{ __html: highlightedExcerpt }}
        />

        {/* Match indicators */}
        {matchedIn.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Matched in:</span>
            {matchedIn.map((field) => (
              <span
                key={field}
                className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
              >
                {field}
              </span>
            ))}
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-2 mt-4">
          {post.author.avatar && (
            <Image
              src={post.author.avatar}
              alt={post.author.name}
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {post.author.name}
          </span>
        </div>
      </Link>
    </article>
  );
}

export default SearchResultCard;
