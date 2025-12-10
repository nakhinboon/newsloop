"use client";

import Link from "next/link";
import Image from "next/image";
import type { HomePostPreview } from "@/lib/types/homepage";

interface BottomGridSectionProps {
  posts: HomePostPreview[];
  locale: string;
  title?: string;
}

export function BottomGridSection({ posts, locale, title = "Also in the News" }: BottomGridSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${locale}/blog/${post.slug}`}
            className="group"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>
            {post.category && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-2 block">
                {post.category.name}
              </span>
            )}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:underline line-clamp-2 mt-1">
              {post.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
