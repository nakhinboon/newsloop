"use client";

import { useCallback } from "react";
import { NEWS_CATEGORY_LIST, type NewsCategory } from "@/lib/news/types";
import { Button } from "@/components/ui/button";

export interface NewsFilterProps {
  activeCategory?: string;
  onCategoryChange?: (category: string | undefined) => void;
  locale?: string;
  basePath?: string;
}

/**
 * NewsFilter component displays category filter buttons.
 * Shows active filter indicator and provides clear filter option.
 * 
 * @requirements 2.1, 2.2, 2.3
 */
export function NewsFilter({
  activeCategory,
  onCategoryChange,
  locale = "en",
  basePath,
}: NewsFilterProps) {
  const handleCategoryClick = useCallback(
    (category: NewsCategory) => {
      if (onCategoryChange) {
        // If clicking the active category, clear the filter
        if (activeCategory === category.slug) {
          onCategoryChange(undefined);
        } else {
          onCategoryChange(category.slug);
        }
      } else if (basePath) {
        // Navigate to category page
        const url =
          activeCategory === category.slug
            ? `/${locale}${basePath}`
            : `/${locale}${basePath}/category/${category.slug}`;
        window.location.href = url;
      }
    },
    [activeCategory, onCategoryChange, locale, basePath]
  );

  const handleClearFilter = useCallback(() => {
    if (onCategoryChange) {
      onCategoryChange(undefined);
    } else if (basePath) {
      window.location.href = `/${locale}${basePath}`;
    }
  }, [onCategoryChange, locale, basePath]);

  const filterByLabel = locale === "th" ? "กรองตาม:" : 
                        locale === "es" ? "Filtrar por:" : 
                        locale === "fr" ? "Filtrer par :" : 
                        "Filter by:";
  
  const clearFilterLabel = locale === "th" ? "ล้างตัวกรอง" : 
                           locale === "es" ? "Limpiar filtro" : 
                           locale === "fr" ? "Effacer le filtre" : 
                           "Clear filter";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
        {filterByLabel}
      </span>

      {NEWS_CATEGORY_LIST.map((category) => {
        const isActive = activeCategory === category.slug;
        return (
          <Button
            key={category.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick(category)}
            aria-pressed={isActive}
            className={isActive ? "" : "hover:bg-gray-100 dark:hover:bg-gray-800"}
          >
            {category.name}
            {isActive && (
              <svg
                className="ml-1 w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </Button>
        );
      })}

      {/* Clear filter button - only show when a filter is active */}
      {activeCategory && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilter}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          {clearFilterLabel}
        </Button>
      )}
    </div>
  );
}

export default NewsFilter;
