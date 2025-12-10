"use client";

import Image from "next/image";
import type { NewsArticle } from "@/lib/news/types";

export interface NewsCardProps {
  article: NewsArticle;
  locale?: string;
}

/**
 * NewsCard component displays a news article preview with title, source, date, thumbnail, and excerpt.
 * Opens original article URL in new tab when clicked.
 * 
 * @requirements 1.2, 1.3, 6.2
 */
export function NewsCard({ article, locale = "en" }: NewsCardProps) {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(article.publishedAt));

  return (
    <article className="group rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Thumbnail with lazy loading */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-800"
      >
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
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
          </div>
        )}
      </a>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Source and date */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {article.source.name}
          </span>
          <span>•</span>
          <time dateTime={new Date(article.publishedAt).toISOString()}>
            {formattedDate}
          </time>
        </div>

        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block flex-1"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
            {article.title}
          </h3>

          {/* Excerpt/Description */}
          {article.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {article.description}
            </p>
          )}
        </a>

        {/* Read more link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
        >
          {locale === "th" ? "อ่านบทความเต็ม" : 
           locale === "es" ? "Leer artículo completo" : 
           locale === "fr" ? "Lire l'article complet" : 
           "Read full article"}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}

export default NewsCard;
