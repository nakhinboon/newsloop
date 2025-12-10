"use client";

import type { PostPreview } from "@/lib/types";
import { PostCard } from "./PostCard";
import { Pagination } from "./Pagination";

export interface PostListProps {
  posts: PostPreview[];
  currentPage: number;
  totalPages: number;
  basePath?: string;
  locale?: string;
  layout?: "grid" | "list";
}

/**
 * PostList component displays a paginated list of post previews.
 * Requirements: 1.4
 */
export function PostList({
  posts,
  currentPage,
  totalPages,
  basePath = "/",
  locale = "en",
  layout = "grid",
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No posts found.</p>
      </div>
    );
  }

  return (
    <div>
      {layout === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} variant="horizontal" />
          ))}
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    </div>
  );
}

export default PostList;
