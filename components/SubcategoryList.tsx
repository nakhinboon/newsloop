"use client";

import Link from "next/link";
import { Folder } from "lucide-react";

export interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
}

export interface SubcategoryListProps {
  subcategories: SubcategoryItem[];
  locale: string;
}

/**
 * SubcategoryList displays child categories with their post counts.
 * 
 * Requirements: 4.2 - Display a list of subcategories with their post counts
 */
export function SubcategoryList({
  subcategories,
  locale,
}: SubcategoryListProps) {
  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Folder className="w-5 h-5" />
        Subcategories
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subcategories.map((subcategory) => (
          <Link
            key={subcategory.id}
            href={`/${locale}/category/${subcategory.slug}`}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {subcategory.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              {subcategory.postCount ?? 0} posts
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default SubcategoryList;
