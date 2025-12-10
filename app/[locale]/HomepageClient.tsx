"use client";

import { useEffect, useState } from "react";
import type { HomepageData, CategoryWithPosts } from "@/lib/types/homepage";
import {
  HeroSection,
  TopStoriesSection,
  MoreNewsSection,
  MustReadSection,
  FeatureSection,
  VideoSection,
  BottomGridSection,
} from "@/components/home";
import { CategoryNewsSection } from "@/components/home";
import { Skeleton } from "@/components/ui/skeleton";

interface HomepageClientProps {
  locale: string;
  initialData: HomepageData | null;
  categories: CategoryWithPosts[];
}

function HomepageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-8 w-3/4 mt-3" />
          <Skeleton className="h-4 w-full mt-2" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      {/* Top Stories Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-6 w-3/4 mt-3" />
            <Skeleton className="h-4 w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="max-w-md mx-auto">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          No posts yet
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Check back soon for the latest news and articles.
        </p>
      </div>
    </div>
  );
}

export function HomepageClient({
  locale,
  initialData,
  categories,
}: HomepageClientProps) {
  const [data, setData] = useState<HomepageData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    // If no initial data, fetch client-side (ไม่ filter locale)
    if (!initialData) {
      const fetchData = async () => {
        try {
          const res = await fetch('/api/posts/featured');
          if (res.ok) {
            const json = await res.json();
            setData(json);
          }
        } catch (error) {
          console.error("Error fetching homepage data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [initialData]);

  if (isLoading) {
    return <HomepageSkeleton />;
  }

  if (!data || !data.hero?.main) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Section */}
      <HeroSection main={data.hero.main} side={data.hero.side} locale={locale} />

      {/* Top Stories */}
      {data.topStories.length > 0 && (
        <TopStoriesSection posts={data.topStories} locale={locale} />
      )}

      {/* More News */}
      {data.moreNews.length > 0 && (
        <MoreNewsSection posts={data.moreNews} locale={locale} />
      )}

      {/* Must Read - Horizontal Scroll */}
      {data.mustRead.length > 0 && (
        <MustReadSection posts={data.mustRead} locale={locale} />
      )}

      {/* Feature Section */}
      {(data.feature?.main || data.feature?.side) && (
        <FeatureSection
          main={data.feature.main}
          side={data.feature.side}
          locale={locale}
        />
      )}

      {/* Video Section */}
      {data.video && <VideoSection post={data.video} locale={locale} />}

      {/* Category Sections */}
      {categories.slice(0, 2).map((category) => (
        <CategoryNewsSection
          key={category.id}
          category={category}
          locale={locale}
        />
      ))}

      {/* Bottom Grid */}
      {data.bottomGrid.length > 0 && (
        <BottomGridSection posts={data.bottomGrid} locale={locale} />
      )}
    </div>
  );
}
