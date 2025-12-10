"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";

export interface CategoryListProps {
  categories: Category[];
  activeCategory?: string;
  locale?: string;
}

/**
 * CategoryList component displays a list of categories for filtering posts.
 * Requirements: 3.3
 */
export function CategoryList({
  categories,
  activeCategory,
  locale = "en",
}: CategoryListProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Categories" className="mb-6">
      {/* 
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
        Categories
      </h3> 
      */}
      <ul className="space-y-1">
        {categories.map((category) => {
          const isActive = activeCategory?.toLowerCase() === category.slug.toLowerCase();
          return (
            <li key={category.slug}>
              <Link
                href={`/${locale}/category/${category.slug}`}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{category.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {category.postCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      {activeCategory && (
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

export default CategoryList;
