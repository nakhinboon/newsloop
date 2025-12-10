import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/translations";
import { getAllPosts } from "@/lib/posts";
import { search } from "@/lib/search";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultCard } from "@/components/SearchResultCard";
import { generateSearchMetadata } from "@/lib/seo";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

/**
 * Generate metadata for the search page.
 * Requirements: 6.1
 */
export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const query = q?.trim() || "";

  return generateSearchMetadata(locale as Locale, query || undefined);
}

/**
 * Search page with results and highlighting.
 * Requirements: 4.1, 4.2, 4.4
 */
export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  const { q } = await searchParams;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const query = q?.trim() || "";

  // Fetch all posts and search
  const allPosts = await getAllPosts();
  const searchResults = search(query, allPosts);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t("common.search", validLocale)}
        </h1>

        {/* Search Bar */}
        <SearchBar
          initialQuery={query}
          locale={validLocale}
          placeholder={t("search.placeholder", validLocale)}
        />
      </div>

      {/* Search Results */}
      <div>
        {query ? (
          <>
            {/* Results Header */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                {searchResults.length > 0 ? (
                  <>
                    {t("blog.showingResultsFor", validLocale, { query })}
                    {" "}
                    <span className="font-medium">
                      ({t("search.results", validLocale, { count: searchResults.length })})
                    </span>
                  </>
                ) : (
                  t("blog.noResults", validLocale, { query })
                )}
              </p>
            </div>

            {/* Results List */}
            {searchResults.length > 0 ? (
              <div className="space-y-6">
                {searchResults.map((result) => (
                  <SearchResultCard
                    key={result.post.slug}
                    result={result}
                    locale={validLocale}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {t("blog.tryDifferentSearch", validLocale)}
                </p>
                <Link
                  href={`/${validLocale}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← {t("blog.allPosts", validLocale)}
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {t("search.placeholder", validLocale)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
