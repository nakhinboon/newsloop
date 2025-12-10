"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import type { PostPreview } from "@/lib/types";
import { PostCard } from "./PostCard";

interface CategoryNewsLayoutProps {
  posts: PostPreview[];
  locale: string;
}

// BBC-style layout patterns
// 1. Hero Left: Big story on left (66%), vertical stack on right (33%)
// 2. Hero Top: Big story on top (100%), grid of 3 below
// 3. Grid Focus: 3 equal columns
// 4. Magazine: 1 Main (50%), 2 smaller (25% each)
const LAYOUT_TYPES = ["hero-left", "hero-top", "grid", "magazine"] as const;

export function CategoryNewsLayout({ posts, locale }: CategoryNewsLayoutProps) {
  // Use post titles to generate a stable seed for layout selection
  const layoutType = useMemo(() => {
    if (posts.length < 5) return "grid"; // Fallback for few posts
    const seed = posts.reduce((acc, p) => acc + p.title.charCodeAt(0), 0);
    return LAYOUT_TYPES[seed % LAYOUT_TYPES.length];
  }, [posts]);

  // Render different layouts
  switch (layoutType) {
    case "hero-left":
      return <HeroLeftLayout posts={posts} locale={locale} />;
    case "hero-top":
      return <HeroTopLayout posts={posts} locale={locale} />;
    case "magazine":
      return <MagazineLayout posts={posts} locale={locale} />;
    case "grid":
    default:
      return <GridLayout posts={posts} locale={locale} />;
  }
}

// Layout 1: Hero Left
// First post is large on left
// Next 2-3 posts are stacked on right
// Rest in grid below
function HeroLeftLayout({ posts, locale }: { posts: PostPreview[]; locale: string }) {
  const heroPost = posts[0];
  const sidePosts = posts.slice(1, 4);
  const remainingPosts = posts.slice(4);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Hero */}
        <div className="lg:col-span-2">
          <Link href={`/${locale}/blog/${heroPost.slug}`} className="group block">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-4">
              {heroPost.image ? (
                <Image
                  src={heroPost.image}
                  alt={heroPost.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-3">
              {heroPost.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 line-clamp-3">
              {heroPost.excerpt}
            </p>
          </Link>
        </div>

        {/* Side Stack */}
        <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800">
          {sidePosts.map((post) => (
            <div key={post.slug} className="pt-6 first:pt-0">
              <PostCard post={post} locale={locale} variant="horizontal" />
            </div>
          ))}
        </div>
      </div>

      {/* Remaining Grid */}
      {remainingPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-gray-800">
          {remainingPosts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
          ))}
        </div>
      )}
    </div>
  );
}

// Layout 2: Hero Top
// First post is full width
// Rest in grid
function HeroTopLayout({ posts, locale }: { posts: PostPreview[]; locale: string }) {
  const heroPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <div className="space-y-8">
      {/* Full Width Hero */}
      <div className="relative group">
        <Link href={`/${locale}/blog/${heroPost.slug}`} className="block">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl mb-6">
             {heroPost.image ? (
                <Image
                  src={heroPost.image}
                  alt={heroPost.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="100vw"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
              )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase mb-3">
                {heroPost.category}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {heroPost.title}
              </h2>
              <p className="text-white/90 text-lg max-w-3xl line-clamp-2">
                {heroPost.excerpt}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {remainingPosts.map((post) => (
          <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
        ))}
      </div>
    </div>
  );
}

// Layout 3: Magazine (Mixed)
// 1 Main (50%), 2 smaller (25% each) in one row if possible, or mixed grid
function MagazineLayout({ posts, locale }: { posts: PostPreview[]; locale: string }) {
  const mainPosts = posts.slice(0, 3);
  const remainingPosts = posts.slice(3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Feature - Spans 2 cols */}
        <div className="lg:col-span-2">
           <Link href={`/${locale}/blog/${mainPosts[0].slug}`} className="group block h-full">
            <div className="relative h-full min-h-[400px] overflow-hidden rounded-lg">
              {mainPosts[0].image ? (
                <Image
                  src={mainPosts[0].image}
                  alt={mainPosts[0].title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {mainPosts[0].title}
                </h2>
                <p className="text-white/80 line-clamp-3">
                  {mainPosts[0].excerpt}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Two smaller posts */}
        {mainPosts.slice(1).map((post) => (
          <div key={post.slug} className="lg:col-span-1">
            <Link href={`/${locale}/blog/${post.slug}`} className="group block h-full flex flex-col">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg mb-3">
                 {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2 line-clamp-3">
                {post.title}
              </h3>
              <div className="text-sm text-gray-500 mt-auto">
                {new Date(post.publishedAt).toLocaleDateString(locale)}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Remaining List */}
      {remainingPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-gray-100 dark:border-gray-800">
          {remainingPosts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
          ))}
        </div>
      )}
    </div>
  );
}

// Layout 4: Standard Grid
function GridLayout({ posts, locale }: { posts: PostPreview[]; locale: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
      ))}
    </div>
  );
}
