"use client";

import Link from "next/link";
import Image from "next/image";
import type { HomePostPreview } from "@/lib/types/homepage";

interface MustReadSectionProps {
  posts: HomePostPreview[];
  locale: string;
  title?: string;
}

export function MustReadSection({ posts, locale, title = "Must Read" }: MustReadSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-8 bg-gray-900 dark:bg-gray-800 -mx-4 px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-700" />
        <div className="flex gap-2">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${locale}/blog/${post.slug}`}
            className="group shrink-0 w-64 snap-start"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-700">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="256px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700" />
              )}
            </div>
            {post.category && (
              <span className="text-xs font-bold text-blue-400 uppercase mt-2 block">
                {post.category.name}
              </span>
            )}
            <h3 className="font-semibold text-white group-hover:underline line-clamp-2 mt-1">
              {post.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
