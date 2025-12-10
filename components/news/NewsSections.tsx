"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { PostPreview } from "@/lib/types";
import { PostCard } from "@/components/PostCard";

// --- Shared Components ---

interface SectionHeaderProps {
  title: string;
  href?: string;
  className?: string;
}

export function SectionHeader({ title, href, className = "" }: SectionHeaderProps) {
  const TitleComponent = (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider border-l-4 border-red-600 pl-3">
      {title}
    </h2>
  );

  return (
    <div className={`mb-6 flex items-center justify-between ${className}`}>
      {href ? (
        <Link href={href} className="group flex items-center gap-2 hover:text-red-600 transition-colors">
          {TitleComponent}
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
        </Link>
      ) : (
        TitleComponent
      )}
    </div>
  );
}

// --- Layout Components ---

interface SectionProps {
  posts: PostPreview[];
  title?: string;
  titleHref?: string;
  locale: string;
}

/**
 * Primary Hero Section
 * Left: Main large story
 * Right: Vertical list of 3-4 stories
 */
export function HeroGridSection({ posts, title, titleHref, locale }: SectionProps) {
  if (!posts.length) return null;
  const mainPost = posts[0];
  const sidePosts = posts.slice(1, 4);

  return (
    <section className="mb-12">
      {title && <SectionHeader title={title} href={titleHref} />}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Hero - 8 cols */}
        <div className="lg:col-span-8">
          <Link href={`/${locale}/blog/${mainPost.slug}`} className="group block">
            <div className="relative aspect-video w-full overflow-hidden mb-4">
              {mainPost.image ? (
                <Image
                  src={mainPost.image}
                  alt={mainPost.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
              )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {mainPost.title}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 line-clamp-3">
              {mainPost.excerpt}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-red-600">{mainPost.category}</span>
              <span>•</span>
              <time>{new Date(mainPost.publishedAt).toLocaleDateString(locale)}</time>
            </div>
          </Link>
        </div>

        {/* Side List - 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-6 border-t lg:border-t-0 pt-6 lg:pt-0 border-gray-100 dark:border-gray-800">
          {sidePosts.map((post) => (
            <div key={post.slug} className="group">
              <Link href={`/${locale}/blog/${post.slug}`} className="block">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                  {post.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {post.excerpt}
                </p>
                <div className="text-xs text-gray-500">
                  <time>{new Date(post.publishedAt).toLocaleDateString(locale)}</time>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Feature Row Section
 * A row of items, can be 4 equal columns or mixed
 */
export function FeatureRowSection({ posts, title, titleHref, locale }: SectionProps) {
  if (!posts.length) return null;
  const displayPosts = posts.slice(0, 4);

  return (
    <section className="mb-12 border-t border-gray-200 dark:border-gray-800 pt-8">
      {title && <SectionHeader title={title} href={titleHref} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPosts.map((post) => (
          <PostCard key={post.slug} post={post} locale={locale} variant="vertical" className="h-full" />
        ))}
      </div>
    </section>
  );
}

/**
 * Split Feature Section
 * Large image on one side (50%), Content on other side (50%)
 */
export function SplitFeatureSection({ posts, title, titleHref, locale }: SectionProps) {
  if (!posts.length) return null;
  const mainPost = posts[0];

  return (
    <section className="mb-12 border-t border-gray-200 dark:border-gray-800 pt-8">
      {title && <SectionHeader title={title} href={titleHref} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden">
        {/* Image Side */}
        <div className="relative aspect-[4/3] lg:aspect-square w-full">
          {mainPost.image ? (
            <Image
              src={mainPost.image}
              alt={mainPost.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
          )}
        </div>

        {/* Content Side */}
        <div className="p-8 lg:p-12">
          <Link href={`/${locale}/blog/${mainPost.slug}`} className="group block">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
              {mainPost.title}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 line-clamp-4 leading-relaxed">
              {mainPost.excerpt}
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
              Read full story
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Dark Section (Must Watch style)
 * Dark background, light text
 */
export function DarkMediaSection({ posts, title, titleHref, locale }: SectionProps) {
  if (!posts.length) return null;
  const displayPosts = posts.slice(0, 4);

  return (
    <section className="full-bleed bg-gray-900 py-12 mb-12 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
           <h2 className="text-xl font-bold text-white uppercase tracking-wider border-l-4 border-red-600 pl-3">
            {title || "Must Read"}
          </h2>
          {titleHref && (
             <Link href={titleHref} className="text-gray-400 hover:text-white transition-colors">
               <ArrowRight className="w-5 h-5" />
             </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayPosts.map((post) => (
            <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className="group block">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-3 bg-gray-800">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                )}
                <div className="absolute bottom-2 left-2 p-1.5 bg-black/60 rounded text-white">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors leading-tight">
                {post.title}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Mixed Feed Section
 * Left: List of items
 * Right: Grid of items
 */
export function MixedFeedSection({ posts, title, titleHref, locale }: SectionProps) {
  if (!posts.length) return null;
  const listPosts = posts.slice(0, 3);
  const gridPosts = posts.slice(3, 5);

  return (
    <section className="mb-12 border-t border-gray-200 dark:border-gray-800 pt-8">
      {title && <SectionHeader title={title} href={titleHref} />}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left List - 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {listPosts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} variant="vertical" className="border-b border-gray-100 dark:border-gray-800 pb-8 last:border-0 last:pb-0" />
          ))}
        </div>

        {/* Right Grid - 8 cols */}
        <div className="lg:col-span-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {gridPosts.map((post) => (
               <PostCard key={post.slug} post={post} locale={locale} variant="vertical" />
             ))}
           </div>
        </div>
      </div>
    </section>
  );
}
