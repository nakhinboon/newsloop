"use client";

import Link from "next/link";
import Image from "next/image";
import type { HomePostPreview } from "@/lib/types/homepage";

interface HeroSectionProps {
  main: HomePostPreview | null;
  side: HomePostPreview[];
  locale: string;
}

export function HeroSection({ main, side, locale }: HeroSectionProps) {
  if (!main) return null;

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Hero */}
        <div className="lg:col-span-2">
          <Link href={`/${locale}/blog/${main.slug}`} className="group block">
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
              {main.image ? (
                <Image
                  src={main.image}
                  alt={main.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>
            <div className="mt-3">
              {main.category && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {main.category.name}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:underline leading-tight">
                {main.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {main.excerpt}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(main.publishedAt)}</span>
                <span>•</span>
                <span>{main.readingTime} min read</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Side Stories */}
        <div className="flex flex-col gap-4">
          {side.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="group flex gap-3"
            >
              <div className="relative w-24 h-24 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {post.category && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {post.category.name}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:underline line-clamp-3 leading-snug">
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
