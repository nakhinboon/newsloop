"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryBreadcrumbProps {
  ancestors: BreadcrumbCategory[];
  currentCategory: BreadcrumbCategory;
  locale: string;
}

/**
 * CategoryBreadcrumb displays the full category path for navigation.
 * Shows: Home > Parent Category > ... > Current Category
 * 
 * Requirements: 4.1 - Display breadcrumb navigation showing the full category path
 */
export function CategoryBreadcrumb({
  ancestors,
  currentCategory,
  locale,
}: CategoryBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1 text-sm text-gray-500 dark:text-gray-400">
        {/* Home link */}
        <li className="flex items-center">
          <Link
            href={`/${locale}`}
            className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {/* Ancestor categories */}
        {ancestors.map((ancestor) => (
          <li key={ancestor.id} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            <Link
              href={`/${locale}/category/${ancestor.slug}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {ancestor.name}
            </Link>
          </li>
        ))}

        {/* Current category (not a link) */}
        <li className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
            {currentCategory.name}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default CategoryBreadcrumb;
