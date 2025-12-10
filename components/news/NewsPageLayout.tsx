"use client";

import type { PostPreview } from "@/lib/types";
import type { HomePostPreview } from "@/lib/types/homepage";
import { HeroSection, MoreNewsSection } from "@/components/home";
import { SubCategoryNav } from "./SubCategoryNav";
import { Pagination } from "@/components/Pagination";

interface SubCategoryData {
  id: string;
  name: string;
  slug: string;
  posts: PostPreview[];
}

interface NewsPageLayoutProps {
  mainCategory: {
    name: string;
    slug: string;
    description?: string;
  };
  mainPosts: PostPreview[];
  subCategories: SubCategoryData[];
  locale: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    basePath: string;
  };
  hideSubNav?: boolean;
}

// Convert PostPreview to HomePostPreview format
function toHomePostPreview(post: PostPreview): HomePostPreview {
  return {
    id: post.slug,
    slug: post.slug,
    locale: "en",
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    featured: post.featured || false,
    author: {
      name: post.author.name,
      avatar: post.author.avatar || null,
    },
    category: post.category ? { name: post.category, slug: post.category.toLowerCase() } : null,
    image: post.image || null,
  };
}

export function NewsPageLayout({
  mainPosts,
  subCategories,
  locale,
  pagination,
  hideSubNav = false
}: NewsPageLayoutProps) {
  
  // Convert posts to HomePostPreview format
  const homePosts = mainPosts.map(toHomePostPreview);
  
  // Main hero: 1 main + 3 side
  const heroMain = homePosts[0] || null;
  const heroSide = homePosts.slice(1, 4);
  const remainingPosts = homePosts.slice(4);

  return (
    <div className="py-6">
      {/* 1. Subcategory Navigation */}
      {!hideSubNav && <SubCategoryNav subCategories={subCategories} locale={locale} />}

      {/* 2. Hero Section - same as homepage */}
      <HeroSection 
        main={heroMain} 
        side={heroSide} 
        locale={locale} 
      />

      {/* 3. More News Section - same as homepage */}
      {remainingPosts.length > 0 && (
        <>
          <MoreNewsSection 
            posts={remainingPosts} 
            locale={locale} 
            title="More News"
          />
          
          {pagination && (
            <Pagination 
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              basePath={pagination.basePath}
            />
          )}
        </>
      )}
    </div>
  );
}
