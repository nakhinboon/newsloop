"use client";

import type { NewsArticle } from "@/lib/news/types";
import { NewsCard } from "./NewsCard";
import { Pagination } from "./Pagination";
import { Skeleton } from "@/components/ui/skeleton";

export interface NewsListProps {
  articles: NewsArticle[];
  currentPage: number;
  totalPages: number;
  basePath?: string;
  locale?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
}

/**
 * NewsCardSkeleton displays a loading placeholder for a news card.
 */
function NewsCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Image skeleton */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Content skeleton */}
      <div className="p-4 flex flex-col flex-1">
        {/* Source and date */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        
        {/* Title */}
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
        
        {/* Read more */}
        <Skeleton className="h-4 w-28 mt-4" />
      </div>
    </div>
  );
}

/**
 * NewsList component displays a paginated list of news articles.
 * Shows loading skeleton while fetching and handles empty state.
 * 
 * @requirements 1.1, 1.4, 6.3
 */
export function NewsList({
  articles,
  currentPage,
  totalPages,
  basePath = "/news",
  locale = "en",
  isLoading = false,
  emptyMessage = "No news articles found.",
  emptyActionLabel = "Browse all news",
  emptyActionHref,
}: NewsListProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <NewsCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Handle empty state
  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          {emptyMessage}
        </h3>
        {emptyActionHref && (
          <a
            href={emptyActionHref}
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {emptyActionLabel}
            <svg
              className="ml-1 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} locale={locale} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    </div>
  );
}

export default NewsList;
