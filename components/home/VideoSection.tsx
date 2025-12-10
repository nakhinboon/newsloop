"use client";

import Link from "next/link";
import Image from "next/image";
import type { HomePostPreview } from "@/lib/types/homepage";

interface VideoSectionProps {
  post: HomePostPreview | null;
  locale: string;
  title?: string;
}

export function VideoSection({ post, locale, title = "Watch" }: VideoSectionProps) {
  if (!post) return null;

  return (
    <section className="mb-8 bg-gray-100 dark:bg-gray-900 -mx-4 px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <Link href={`/${locale}/blog/${post.slug}`} className="group">
          <div className="relative aspect-video overflow-hidden bg-gray-200 dark:bg-gray-800">
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800" />
            )}
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-black/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-gray-900 dark:text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        <div>
          {post.category && (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
              {post.category.name}
            </span>
          )}
          <Link href={`/${locale}/blog/${post.slug}`} className="group block">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:underline mt-2 leading-tight">
              {post.title}
            </h3>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-3 line-clamp-4">
            {post.excerpt}
          </p>
          <Link
            href={`/${locale}/blog/${post.slug}`}
            className="inline-flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Watch now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
