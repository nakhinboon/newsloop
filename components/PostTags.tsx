"use client";

import Link from "next/link";

export interface PostTagsProps {
  tags: string[];
  locale?: string;
}

export function PostTags({ tags, locale = "en" }: PostTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 mb-8 pt-8 border-t border-gray-200 dark:border-gray-800">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/${locale}/tag/${tag.toLowerCase()}`}
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
