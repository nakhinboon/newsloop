"use client";

import Link from "next/link";
import Image from "next/image";
import type { PostPreview } from "@/lib/types";

export interface PostCardProps {
  post: PostPreview;
  locale?: string;
  variant?: "vertical" | "horizontal";
  className?: string;
}

/**
 * PostCard component displays a post preview with title, excerpt, author, date, category, and reading time.
 * Links to the full post using the slug.
 * Requirements: 1.2, 1.3
 */
export function PostCard({ post, locale = "en", variant = "vertical", className = "" }: PostCardProps) {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(post.publishedAt);

  if (variant === "horizontal") {
    return (
      <article className={`group flex flex-col md:flex-row gap-6 items-start ${className}`}>
        {/* Image - Left Side */}
        <Link href={`/${locale}/blog/${post.slug}`} className="block w-full md:w-1/3 flex-shrink-0">
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
        </Link>

        {/* Content - Right Side */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-red-500 mb-2 uppercase tracking-wide">
            {post.category}
          </div>
          
          <Link href={`/${locale}/blog/${post.slug}`} className="block group">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
              {post.title}
            </h2>
          </Link>

          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3 gap-3">
             <span className="font-medium text-gray-900 dark:text-gray-100">
              By {post.author.name}
            </span>
            <span>{formattedDate}</span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 text-sm leading-relaxed">
            {post.excerpt}
          </p>

          <Link 
            href={`/${locale}/blog/${post.slug}`}
            className="text-red-500 hover:text-red-600 font-semibold text-sm inline-flex items-center gap-1"
          >
            Read more
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </article>
    );
  }

  // Vertical (Grid) Layout
  return (
    <article className={`group rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors h-full flex flex-col ${className}`}>
       {post.image && (
        <Link href={`/${locale}/blog/${post.slug}`} className="block mb-4 overflow-hidden rounded-md aspect-video relative">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
      )}
      
      <Link href={`/${locale}/blog/${post.slug}`} className="block flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {post.category}
          </span>
          <span>•</span>
          <time dateTime={post.publishedAt.toISOString()}>{formattedDate}</time>
          <span>•</span>
          <span>{post.readingTime} min read</span>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
          {post.title}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-2 mt-auto">
          {post.author.avatar && (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {post.author.name}
          </span>
        </div>
      </Link>
    </article>
  );
}

export default PostCard;
