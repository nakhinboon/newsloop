import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/translations";
import { getNewsService } from "@/lib/news/service";
import { NewsList } from "@/components/NewsList";
import { NewsFilter } from "@/components/NewsFilter";
import { NewsSearch } from "@/components/NewsSearch";

interface NewsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

const NEWS_PER_PAGE = 12;

/**
 * Generate metadata for the news page.
 * @requirements 7.2
 */
export async function generateMetadata({
  params,
}: NewsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const validLocale = locale as Locale;
  const title = t("news.title", validLocale);
  const description = t("news.description", validLocale);

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
 * News listing page with search and category filtering.
 * Server component that fetches news using locale from params.
 * 
 * @requirements 1.1, 7.2
 */
export default async function NewsPage({ params, searchParams }: NewsPageProps) {
  const { locale } = await params;
  const { page, q: searchQuery } = await searchParams;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  // Get news service
  const newsService = getNewsService();

  // Check if news service is available
  if (!newsService.isAvailable()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {t("news.title", validLocale)}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t("news.unavailable", validLocale)}
          </p>
        </div>
      </div>
    );
  }

  // Fetch news - use search if query provided, otherwise get all news
  let newsResponse;
  try {
    if (searchQuery && searchQuery.trim()) {
      newsResponse = await newsService.searchNews(searchQuery, {
        locale: validLocale,
        page: currentPage,
        pageSize: NEWS_PER_PAGE,
      });
    } else {
      newsResponse = await newsService.getNews({
        locale: validLocale,
        page: currentPage,
        pageSize: NEWS_PER_PAGE,
      });
    }
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

  const basePath = searchQuery 
    ? `/${validLocale}/news?q=${encodeURIComponent(searchQuery)}`
    : `/${validLocale}/news`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("news.title", validLocale)}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("news.subtitle", validLocale)}
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <NewsSearch
          initialQuery={searchQuery || ""}
          placeholder={t("news.searchPlaceholder", validLocale)}
          useUrlNavigation
          basePath={`/${validLocale}/news`}
        />

        {/* Category Filter */}
        <NewsFilter
          locale={validLocale}
          basePath="/news"
        />
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("news.searchResults", validLocale, { 
              query: searchQuery,
              count: newsResponse.totalResults 
            })}
          </p>
        </div>
      )}

      {/* News List */}
      <NewsList
        articles={newsResponse.articles}
        currentPage={newsResponse.page}
        totalPages={newsResponse.totalPages}
        basePath={basePath}
        locale={validLocale}
        emptyMessage={
          searchQuery 
            ? t("news.noSearchResults", validLocale)
            : t("news.noNews", validLocale)
        }
        emptyActionLabel={t("news.browseAll", validLocale)}
        emptyActionHref={`/${validLocale}/news`}
      />
    </div>
  );
}
