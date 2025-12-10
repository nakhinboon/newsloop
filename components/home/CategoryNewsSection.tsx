"use client";

import Link from "next/link";
import Image from "next/image";
import type { CategoryWithPosts } from "@/lib/types/homepage";

interface CategoryNewsSectionProps {
  category: CategoryWithPosts;
  locale: string;
}

export function CategoryNewsSection({ category, locale }: CategoryNewsSectionProps) {
  if (!category.posts || category.posts.length === 0) return null;

  const mainPost = category.posts[0];
  const sidePosts = category.posts.slice(1, 4);

  return (
    <section className="mb-8 border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {category.name}
        </h2>
        <Link
          href={`/${locale}/category/${category.slug}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Post */}
        <Link href={`/${locale}/blog/${mainPost.slug}`} className="group">
          <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
            {mainPost.image ? (
              <Image
                src={mainPost.image}
                alt={mainPost.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:underline mt-3 line-clamp-2">
            {mainPost.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {mainPost.excerpt}
          </p>
        </Link>

        {/* Side Posts */}
        <div className="flex flex-col gap-4">
          {sidePosts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="group flex gap-4"
            >
              <div className="relative w-28 h-20 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="112px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white group-hover:underline line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
