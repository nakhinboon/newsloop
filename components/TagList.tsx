"use client";

import Link from "next/link";
import type { Tag } from "@/lib/types";

export interface TagListProps {
  tags: Tag[];
  activeTag?: string;
  locale?: string;
}

/**
 * TagList component displays a list/cloud of tags for filtering posts.
 * Requirements: 3.3
 */
export function TagList({ tags, activeTag, locale = "en" }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Tags" className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
        Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isActive = activeTag?.toLowerCase() === tag.slug.toLowerCase();
          return (
            <Link
              key={tag.slug}
              href={`/${locale}/tag/${tag.slug}`}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              #{tag.name}
              <span className="ml-1 text-xs opacity-70">({tag.postCount})</span>
            </Link>
          );
        })}
      </div>
      
      {activeTag && (
        <Link
          href={`/${locale}`}
          className="inline-flex items-center mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Clear filter
        </Link>
      )}
    </nav>
  );
}

export default TagList;
