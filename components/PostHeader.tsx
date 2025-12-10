"use client";

import Image from "next/image";
import { Share2, Bookmark } from "lucide-react";
import type { Post } from "@/lib/types";

export interface PostHeaderProps {
  post: Post;
  locale?: string;
}

/**
 * PostHeader component displays full post metadata including title, author, date, and share options.
 * Requirements: 2.1, 2.2
 */
export function PostHeader({ post, locale = "en" }: PostHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(post.publishedAt);

  return (
    <header className="mb-8">
      {/* Title */}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
        {post.title}
      </h1>

      {/* Meta info */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          {/* Author */}
          <div className="flex items-center gap-2">
            {post.author.avatar && (
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {post.author.name}
              </span>
              <time dateTime={post.publishedAt.toISOString()} className="text-xs text-gray-500 dark:text-gray-400">
                {formattedDate}
              </time>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <button className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>
          <button className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Bookmark className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Save</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default PostHeader;
