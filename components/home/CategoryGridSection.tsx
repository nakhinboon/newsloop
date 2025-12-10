"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import type { CategoryWithPosts } from "@/lib/types/homepage";

interface CategoryGridSectionProps {
  categories: CategoryWithPosts[];
  locale: string;
  title?: string;
}

// Reuse layout concepts but for categories
const LAYOUT_TYPES = ["hero-left", "hero-top", "grid", "magazine"] as const;

export function CategoryGridSection({
  categories,
  locale,
  title,
}: CategoryGridSectionProps) {
  // Use category names to generate a stable seed
  const layoutType = useMemo(() => {
    if (categories.length < 3) return "grid"; // Fallback
    const seed = categories.reduce((acc, c) => acc + c.name.charCodeAt(0), 0);
    return LAYOUT_TYPES[seed % LAYOUT_TYPES.length];
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <section className="mb-12">
      {title && (
        <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
          <div className="w-1 h-6 bg-red-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {title}
          </h2>
        </div>
      )}

      {renderLayout(layoutType, categories, locale)}
    </section>
  );
}

function renderLayout(type: string, categories: CategoryWithPosts[], locale: string) {
  switch (type) {
    case "hero-left":
      return <HeroLeftLayout categories={categories} locale={locale} />;
    case "hero-top":
      return <HeroTopLayout categories={categories} locale={locale} />;
    case "magazine":
      return <MagazineLayout categories={categories} locale={locale} />;
    case "grid":
    default:
      return <GridLayout categories={categories} locale={locale} />;
  }
}

// Shared Card Component
function SubCategoryCard({
  category,
  locale,
  variant = "vertical",
  featured = false,
}: {
  category: CategoryWithPosts;
  locale: string;
  variant?: "vertical" | "horizontal";
  featured?: boolean;
}) {
  const post = category.posts?.[0];

  if (!post) {
    // Fallback for categories without posts
    return (
      <Link
        href={`/${locale}/category/${category.slug}`}
        className="block p-6 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <h3 className="font-bold text-gray-900 dark:text-white">{category.name}</h3>
        <span className="text-sm text-gray-500">{category.postCount} posts</span>
      </Link>
    );
  }

  const ImageComponent = (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-lg ${
      variant === "horizontal" ? "w-full md:w-1/3 aspect-4/3" : "w-full aspect-video mb-3"
    } ${featured ? "aspect-video mb-4" : ""}`}>
      {post.image ? (
        <Image
          src={post.image}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={featured ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          {category.name}
        </div>
      )}
    </div>
  );

  if (variant === "horizontal") {
    return (
      <Link href={`/${locale}/category/${category.slug}`} className="group flex flex-col md:flex-row gap-4 items-start">
        {ImageComponent}
        <div className="flex-1">
          <span className="inline-block px-2 py-0.5 mb-2 text-xs font-bold text-red-600 uppercase bg-red-50 dark:bg-red-900/20 rounded-xs">
            {category.name}
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {post.excerpt}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/category/${category.slug}`} className="group block h-full">
      {ImageComponent}
      <div className="flex flex-col h-full">
        <span className="inline-block px-2 py-0.5 mb-2 text-xs font-bold text-red-600 uppercase bg-red-50 dark:bg-red-900/20 rounded-xs self-start">
          {category.name}
        </span>
        <h3 className={`${featured ? "text-2xl" : "text-lg"} font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2`}>
          {post.title}
        </h3>
        <p className={`text-gray-600 dark:text-gray-400 ${featured ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}

// Layouts
function HeroLeftLayout({ categories, locale }: { categories: CategoryWithPosts[]; locale: string }) {
  const hero = categories[0];
  const side = categories.slice(1, 3);
  const rest = categories.slice(3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SubCategoryCard category={hero} locale={locale} featured={true} />
        </div>
        <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800">
          {side.map((cat) => (
            <div key={cat.id} className="pt-6 first:pt-0">
              <SubCategoryCard category={cat} locale={locale} variant="horizontal" />
            </div>
          ))}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-gray-800">
          {rest.map((cat) => (
            <SubCategoryCard key={cat.id} category={cat} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroTopLayout({ categories, locale }: { categories: CategoryWithPosts[]; locale: string }) {
  const hero = categories[0];
  const rest = categories.slice(1);

  return (
    <div className="space-y-8">
      {/* Full width hero style for subcategory */}
      <Link href={`/${locale}/category/${hero.slug}`} className="group block relative aspect-21/9 w-full overflow-hidden rounded-xl">
        {hero.posts?.[0]?.image ? (
          <Image
            src={hero.posts[0].image}
            alt={hero.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-8">
          <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase mb-3">
            {hero.name}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {hero.posts?.[0]?.title}
          </h2>
          <p className="text-white/90 max-w-2xl line-clamp-2">
            {hero.posts?.[0]?.excerpt}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rest.map((cat) => (
          <SubCategoryCard key={cat.id} category={cat} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function MagazineLayout({ categories, locale }: { categories: CategoryWithPosts[]; locale: string }) {
  const main = categories.slice(0, 3);
  const rest = categories.slice(3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <SubCategoryCard category={main[0]} locale={locale} featured={true} />
        </div>
        {main.slice(1).map((cat) => (
          <div key={cat.id} className="lg:col-span-1">
             <SubCategoryCard category={cat} locale={locale} />
          </div>
        ))}
      </div>
      {rest.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-gray-800">
          {rest.map((cat) => (
            <SubCategoryCard key={cat.id} category={cat} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function GridLayout({ categories, locale }: { categories: CategoryWithPosts[]; locale: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categories.map((cat) => (
        <SubCategoryCard key={cat.id} category={cat} locale={locale} />
      ))}
    </div>
  );
}

export default CategoryGridSection;
