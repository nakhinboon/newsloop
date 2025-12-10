"use client";

import Link from "next/link";
import Image from "next/image";
import type { HomePostPreview } from "@/lib/types/homepage";

interface FeatureSectionProps {
  main: HomePostPreview | null;
  side: HomePostPreview | null;
  locale: string;
  title?: string;
}

export function FeatureSection({ main, side, locale, title = "Features & Analysis" }: FeatureSectionProps) {
  if (!main && !side) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Feature */}
        {main && (
          <Link href={`/${locale}/blog/${main.slug}`} className="group">
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
              {main.image ? (
                <Image
                  src={main.image}
                  alt={main.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>
            {main.category && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-3 block">
                {main.category.name}
              </span>
            )}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:underline mt-1 line-clamp-2">
              {main.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
              {main.excerpt}
            </p>
          </Link>
        )}

        {/* Side Feature */}
        {side && (
          <Link href={`/${locale}/blog/${side.slug}`} className="group flex flex-col">
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
              {side.image ? (
                <Image
                  src={side.image}
                  alt={side.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>
            {side.category && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-3 block">
                {side.category.name}
              </span>
            )}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:underline mt-1 line-clamp-2">
              {side.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
              {side.excerpt}
            </p>
          </Link>
        )}
      </div>
    </section>
  );
}
