"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface NewsSearchProps {
  initialQuery?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  debounceMs?: number;
  /** If true, navigates via URL instead of callback */
  useUrlNavigation?: boolean;
  /** Base path for URL navigation (e.g., "/en/news") */
  basePath?: string;
}

/**
 * NewsSearch component provides a search input with debounce.
 * Handles empty/whitespace queries by treating them as "show all".
 * 
 * @requirements 3.1, 3.2, 3.3
 */
export function NewsSearch({
  initialQuery = "",
  placeholder = "Search news...",
  onSearch,
  debounceMs = 300,
  useUrlNavigation = false,
  basePath,
}: NewsSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Determine the base path for URL navigation
  const resolvedBasePath = basePath || pathname;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        if (onSearch) {
          // Trim whitespace - empty/whitespace queries return all news (Req 3.2)
          const trimmedQuery = newQuery.trim();
          onSearch(trimmedQuery);
        }
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  // Navigate to search URL
  const navigateToSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        router.push(`${resolvedBasePath}?q=${encodeURIComponent(trimmedQuery)}`);
      } else {
        // Remove query param if empty
        router.push(resolvedBasePath);
      }
    },
    [router, resolvedBasePath]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const trimmedQuery = query.trim();
      
      if (useUrlNavigation) {
        navigateToSearch(trimmedQuery);
      } else if (onSearch) {
        onSearch(trimmedQuery);
      }
    },
    [query, onSearch, useUrlNavigation, navigateToSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (useUrlNavigation) {
      navigateToSearch("");
    } else if (onSearch) {
      onSearch("");
    }
  }, [onSearch, useUrlNavigation, navigateToSearch]);

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md" role="search">
      <label htmlFor="news-search-input" className="sr-only">
        Search news
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          id="news-search-input"
          type="search"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* No results hint - shown when search is active */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Press Enter to search or type to filter results
      </p>
    </form>
  );
}

export default NewsSearch;
