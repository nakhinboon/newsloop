"use client";

import Link from "next/link";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

/**
 * Pagination component for navigating between pages of posts.
 * Requirements: 1.4
 */
export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Show limited page numbers with ellipsis for large page counts
  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return pages;
    }
    
    const visible: (number | "ellipsis")[] = [];
    
    // Always show first page
    visible.push(1);
    
    if (currentPage > 3) {
      visible.push("ellipsis");
    }
    
    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      visible.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      visible.push("ellipsis");
    }
    
    // Always show last page
    if (totalPages > 1) {
      visible.push(totalPages);
    }
    
    return visible;
  };

  const buildPageUrl = (page: number) => {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  };

  return (
    <nav aria-label="Pagination" className="flex justify-center items-center gap-1 mt-8">
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Previous page"
        >
          ← Previous
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed">
          ← Previous
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1 mx-2">
        {getVisiblePages().map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-500">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildPageUrl(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                page === currentPage
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Next page"
        >
          Next →
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed">
          Next →
        </span>
      )}
    </nav>
  );
}

export default Pagination;
