"use client";

import Link from "next/link";
import Image from "next/image";
import type { PostPreview } from "@/lib/types";

interface RecentPostsProps {
  posts: PostPreview[];
  locale?: string;
}

export function RecentPosts({ posts, locale = "en" }: RecentPostsProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 border-l-4 border-black dark:border-white pl-3">
        Recent Posts
      </h3>
      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/blog/${post.slug}`}
            className="flex gap-4 group"
          >
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                {post.title}
              </h4>
              <time className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(post.publishedAt)}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
