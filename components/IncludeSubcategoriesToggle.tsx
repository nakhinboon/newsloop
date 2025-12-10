"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface IncludeSubcategoriesToggleProps {
  includeSubcategories: boolean;
  basePath: string;
  hasSubcategories: boolean;
}

/**
 * Toggle for including/excluding posts from subcategories.
 * 
 * Requirements: 4.3 - Display posts from the category and optionally from all subcategories
 */
export function IncludeSubcategoriesToggle({
  includeSubcategories,
  basePath,
  hasSubcategories,
}: IncludeSubcategoriesToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (includeSubcategories) {
      params.delete("includeSubcategories");
    } else {
      params.set("includeSubcategories", "true");
    }
    
    // Reset to page 1 when toggling
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ""}`);
  }, [includeSubcategories, basePath, router, searchParams]);

  // Don't show toggle if there are no subcategories
  if (!hasSubcategories) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={includeSubcategories}
          onChange={handleToggle}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Include posts from subcategories
        </span>
      </label>
    </div>
  );
}

export default IncludeSubcategoriesToggle;
