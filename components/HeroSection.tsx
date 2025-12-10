"use client";

import Link from "next/link";
import Image from "next/image";
import type { PostPreview } from "@/lib/types";

interface HeroSectionProps {
  posts: PostPreview[];
  locale?: string;
}

export function HeroSection({ posts, locale = "en" }: HeroSectionProps) {
  if (posts.length === 0) return null;

  const mainPost = posts[0];
  const sidePosts = posts.slice(1, 3);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
      {/* Main Hero Post (Left, spans 2 cols) */}
      <div className="lg:col-span-2 relative h-[400px] lg:h-[500px] rounded-xl overflow-hidden group">
        <Link href={`/${locale}/blog/${mainPost.slug}`} className="block h-full w-full">
          <div className="absolute inset-0">
            {mainPost.image ? (
              <Image
                src={mainPost.image}
                alt={mainPost.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
          
          <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-white bg-blue-600 rounded-full">
              {mainPost.category}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
              {mainPost.title}
            </h2>
            <div className="flex items-center text-gray-300 text-sm gap-4">
              <span className="font-medium text-white">{mainPost.author.name}</span>
              <span>{formatDate(mainPost.publishedAt)}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Side Hero Posts (Right, stacked) */}
      <div className="flex flex-col gap-4 h-[500px]">
        {sidePosts.map((post) => (
          <div key={post.slug} className="relative flex-1 rounded-xl overflow-hidden group">
            <Link href={`/${locale}/blog/${post.slug}`} className="block h-full w-full">
              <div className="absolute inset-0">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
              
              <div className="absolute bottom-0 left-0 p-5 w-full">
                <span className="inline-block px-2 py-0.5 mb-2 text-xs font-semibold text-white bg-purple-600 rounded-full">
                  {post.category}
                </span>
                <h3 className="text-lg font-bold text-white mb-1 leading-snug line-clamp-2">
                  {post.title}
                </h3>
                <div className="text-gray-300 text-xs">
                  {formatDate(post.publishedAt)}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
