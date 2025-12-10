import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/translations";
import { getNewsService } from "@/lib/news/service";
import { NEWS_CATEGORY_LIST } from "@/lib/news/types";
import { NewsList } from "@/components/NewsList";
import { NewsFilter } from "@/components/NewsFilter";
import { NewsSearch } from "@/components/NewsSearch";

interface NewsCategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
}

const NEWS_PER_PAGE = 12;

/**
 * Generate static params for all news categories.
 */
export function generateStaticParams() {
  return NEWS_CATEGORY_LIST.map((category) => ({
    category: category.slug,
  }));
}

/**
 * Generate metadata for the news category page.
 * @requirements 2.1
 */
export async function generateMetadata({
  params,
}: NewsCategoryPageProps): Promise<Metadata> {
  const { locale, category } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const validLocale = locale as Locale;
  const categoryData = NEWS_CATEGORY_LIST.find((c) => c.slug === category);

  if (!categoryData) {
    return { title: "Not Found" };
  }

  const title = `${categoryData.name} - ${t("news.title", validLocale)}`;
  const description = t("news.categoryDescription", validLocale, {
    category: categoryData.name,
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

/**
 * News category page showing news filtered by category.
 * Shows active category indicator.
 * 
 * @requirements 2.1
 */
export default async function NewsCategoryPage({
  params,
  searchParams,
}: NewsCategoryPageProps) {
  const { locale, category } = await params;
  const { page } = await searchParams;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  // Validate category
  const categoryData = NEWS_CATEGORY_LIST.find((c) => c.slug === category);
  if (!categoryData) {
    notFound();
  }

  // Get news service
  const newsService = getNewsService();

  // Check if news service is available
  if (!newsService.isAvailable()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {categoryData.name} - {t("news.title", validLocale)}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t("news.unavailable", validLocale)}
          </p>
        </div>
      </div>
    );
  }

  // Fetch news by category
  let newsResponse;
  try {
    newsResponse = await newsService.getNewsByCategory(category, {
      locale: validLocale,
      page: currentPage,
      pageSize: NEWS_PER_PAGE,
    });
  } catch (error) {
    console.error("Failed to fetch news:", error);
    newsResponse = {
      articles: [],
      totalResults: 0,
      page: 1,
      pageSize: NEWS_PER_PAGE,
      totalPages: 0,
    };
  }

  const basePath = `/${validLocale}/news/category/${category}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link
              href={`/${validLocale}/news`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {t("news.title", validLocale)}
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="font-medium text-gray-900 dark:text-gray-100">
            {categoryData.name}
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {categoryData.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("news.categorySubtitle", validLocale, {
            category: categoryData.name,
            count: newsResponse.totalResults,
          })}
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <NewsSearch
          placeholder={t("news.searchPlaceholder", validLocale)}
          useUrlNavigation
          basePath={`/${validLocale}/news`}
        />

        {/* Category Filter - shows active category */}
        <NewsFilter
          activeCategory={category}
          locale={validLocale}
          basePath="/news"
        />
      </div>

      {/* News List */}
      <NewsList
        articles={newsResponse.articles}
        currentPage={newsResponse.page}
        totalPages={newsResponse.totalPages}
        basePath={basePath}
        locale={validLocale}
        emptyMessage={t("news.noCategoryNews", validLocale, {
          category: categoryData.name,
        })}
        emptyActionLabel={t("news.browseAll", validLocale)}
        emptyActionHref={`/${validLocale}/news`}
      />
    </div>
  );
}
