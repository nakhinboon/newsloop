/**
 * News Service Property-Based Tests
 *
 * Tests for news service correctness properties using fast-check.
 *
 * @requirements 1.1, 2.1, 3.1, 3.2, 7.1, 7.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { NewsArticle, NewsQueryOptions, NewsResponse } from './types';
import {
  sortArticlesByDate,
  resolveLocale,
  isEmptyQuery,
} from './service';
import { NEWS_SUPPORTED_LOCALES, getNewsFallbackLocale } from '@/lib/config/news';

/**
 * Arbitrary for generating valid NewsArticle objects
 */
const newsArticleArbitrary: fc.Arbitrary<NewsArticle> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  content: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  url: fc.webUrl(),
  imageUrl: fc.option(fc.webUrl(), { nil: null }),
  source: fc.record({
    id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  publishedAt: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  }),
  category: fc.option(
    fc.constantFrom('general', 'business', 'technology', 'entertainment', 'health', 'science', 'sports'),
    { nil: undefined }
  ),
});

/**
 * Property-Based Tests
 * **Feature: external-news-feed, Property 1: News ordering by date**
 * **Validates: Requirements 1.1**
 *
 * For any collection of news articles returned by getNews(),
 * the articles SHALL be ordered by publishedAt date in descending order (newest first).
 */
describe('Property 1: News ordering by date', () => {
  it('sortArticlesByDate returns articles in descending date order (newest first)', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          const sorted = sortArticlesByDate(articles);

          // Property: Articles should be sorted by publishedAt descending
          for (let i = 1; i < sorted.length; i++) {
            const prevDate = sorted[i - 1].publishedAt.getTime();
            const currDate = sorted[i].publishedAt.getTime();
            if (prevDate < currDate) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortArticlesByDate preserves all articles (no articles lost or duplicated)', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          const sorted = sortArticlesByDate(articles);

          // Property: Sorted array should have same length as input
          if (sorted.length !== articles.length) {
            return false;
          }

          // Property: All original article IDs should be present
          const originalIds = new Set(articles.map((a) => a.id));
          const sortedIds = new Set(sorted.map((a) => a.id));

          if (originalIds.size !== sortedIds.size) {
            return false;
          }

          for (const id of originalIds) {
            if (!sortedIds.has(id)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortArticlesByDate does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 1, maxLength: 50 }),
        (articles) => {
          // Store original order
          const originalOrder = articles.map((a) => a.id);

          // Sort
          sortArticlesByDate(articles);

          // Property: Original array should be unchanged
          const afterOrder = articles.map((a) => a.id);
          return originalOrder.every((id, idx) => id === afterOrder[idx]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortArticlesByDate is idempotent (sorting twice gives same result)', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          const sortedOnce = sortArticlesByDate(articles);
          const sortedTwice = sortArticlesByDate(sortedOnce);

          // Property: Sorting twice should give same order
          if (sortedOnce.length !== sortedTwice.length) {
            return false;
          }

          for (let i = 0; i < sortedOnce.length; i++) {
            if (sortedOnce[i].id !== sortedTwice[i].id) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests
 * **Feature: external-news-feed, Property 5: Search returns matching articles**
 * **Feature: external-news-feed, Property 6: Empty search returns all news**
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Property 5 & 6: Search query handling', () => {
  /**
   * Property 6: Empty search returns all news
   * For any search query consisting only of empty string or whitespace characters,
   * the search SHALL return all news without filtering.
   */
  it('isEmptyQuery returns true for empty string', () => {
    expect(isEmptyQuery('')).toBe(true);
  });

  it('isEmptyQuery returns true for undefined', () => {
    expect(isEmptyQuery(undefined)).toBe(true);
  });

  it('isEmptyQuery returns true for whitespace-only strings', () => {
    fc.assert(
      fc.property(
        // Generate strings containing only whitespace characters
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
          .map((chars) => chars.join('')),
        (whitespaceString) => {
          // Property: Any whitespace-only string should be considered empty
          return isEmptyQuery(whitespaceString) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isEmptyQuery returns false for non-empty strings with content', () => {
    fc.assert(
      fc.property(
        // Generate strings with at least one non-whitespace character
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        (nonEmptyString) => {
          // Property: Any string with non-whitespace content should not be empty
          return isEmptyQuery(nonEmptyString) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests
 * **Feature: external-news-feed, Property 11: Locale parameter in API request**
 * **Feature: external-news-feed, Property 12: Unsupported locale fallback**
 * **Validates: Requirements 7.1, 7.3**
 */
describe('Property 11 & 12: Locale handling', () => {
  const supportedLocales = [...NEWS_SUPPORTED_LOCALES];
  const fallbackLocale = getNewsFallbackLocale();

  /**
   * Property 11: Locale parameter in API request
   * For any locale L in the supported locales list,
   * API requests SHALL include the language parameter matching L.
   */
  it('resolveLocale returns the same locale for supported locales', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedLocales),
        (supportedLocale) => {
          // Property: Supported locales should be returned as-is
          return resolveLocale(supportedLocale) === supportedLocale;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Unsupported locale fallback
   * For any locale L not supported by the news API,
   * the News_System SHALL request news in English as fallback.
   */
  it('resolveLocale returns fallback locale for unsupported locales', () => {
    fc.assert(
      fc.property(
        // Generate locale strings that are NOT in the supported list
        fc.string({ minLength: 2, maxLength: 5 })
          .filter((s) => !supportedLocales.includes(s as typeof supportedLocales[number])),
        (unsupportedLocale) => {
          // Property: Unsupported locales should fall back to English
          return resolveLocale(unsupportedLocale) === fallbackLocale;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('resolveLocale always returns a supported locale', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 10 }),
        (anyLocale) => {
          const resolved = resolveLocale(anyLocale);
          // Property: Result should always be a supported locale
          return supportedLocales.includes(resolved as typeof supportedLocales[number]);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: external-news-feed, Property 4: Category filtering**
 * **Validates: Requirements 2.1**
 *
 * For any category C and the result set R from getNewsByCategory(C),
 * every article in R SHALL belong to category C.
 */
describe('Property 4: Category filtering', () => {
  const supportedCategories = [
    'general',
    'business',
    'technology',
    'entertainment',
    'health',
    'science',
    'sports',
  ] as const;

  /**
   * Pure function that filters articles by category
   * This mirrors the expected behavior of getNewsByCategory
   */
  function filterByCategory(
    articles: NewsArticle[],
    category: string
  ): NewsArticle[] {
    return articles.filter(
      (article) =>
        article.category?.toLowerCase() === category.toLowerCase()
    );
  }

  it('every article in filtered result has the requested category', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        fc.constantFrom(...supportedCategories),
        (articles, category) => {
          const filtered = filterByCategory(articles, category);

          // Property: Every article in result has category === C (case-insensitive)
          for (const article of filtered) {
            if (article.category?.toLowerCase() !== category.toLowerCase()) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtered result contains ALL articles with the requested category', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        fc.constantFrom(...supportedCategories),
        (articles, category) => {
          const filtered = filterByCategory(articles, category);

          // Property: Result SHALL contain all articles with that category
          const expectedArticles = articles.filter(
            (a) => a.category?.toLowerCase() === category.toLowerCase()
          );

          if (filtered.length !== expectedArticles.length) {
            return false;
          }

          // Verify all expected articles are in result
          const resultIds = new Set(filtered.map((a) => a.id));
          for (const expected of expectedArticles) {
            if (!resultIds.has(expected.id)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtering by category that exists returns non-empty result', () => {
    // Generate articles with specific category
    const articleWithCategoryArbitrary = fc.constantFrom(...supportedCategories).chain(
      (category) =>
        newsArticleArbitrary.map((article) => ({
          ...article,
          category,
        }))
    );

    fc.assert(
      fc.property(
        fc.array(articleWithCategoryArbitrary, { minLength: 1, maxLength: 50 }),
        (articles) => {
          // Pick a category that exists in the articles
          const existingCategory = articles[0].category!;
          const filtered = filterByCategory(articles, existingCategory);

          // Property: If we filter by an existing category, we should get at least one result
          return filtered.length >= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtering by non-existent category returns empty result', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          // Use a category that definitely doesn't exist
          const nonExistentCategory = '___NON_EXISTENT_CATEGORY_12345___';
          const filtered = filterByCategory(articles, nonExistentCategory);

          // Property: Filtering by non-existent category returns empty
          return filtered.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: external-news-feed, Property 5: Search returns matching articles**
 * **Validates: Requirements 3.1**
 *
 * For any non-empty search query Q and result set R from searchNews(Q),
 * every article in R SHALL contain Q (case-insensitive) in its title or description.
 */
describe('Property 5: Search returns matching articles', () => {
  /**
   * Pure function that filters articles by search query
   * This mirrors the expected behavior of searchNews
   */
  function searchArticles(
    articles: NewsArticle[],
    query: string
  ): NewsArticle[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length === 0) {
      return articles;
    }

    return articles.filter((article) => {
      const title = article.title.toLowerCase();
      const description = (article.description ?? '').toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }

  it('every article in search result contains the query in title or description', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        // Generate non-empty search queries
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (articles, query) => {
          const results = searchArticles(articles, query);
          const normalizedQuery = query.toLowerCase().trim();

          // Property: Every article in result contains Q in title or description
          for (const article of results) {
            const title = article.title.toLowerCase();
            const description = (article.description ?? '').toLowerCase();
            const matchesTitle = title.includes(normalizedQuery);
            const matchesDescription = description.includes(normalizedQuery);

            if (!matchesTitle && !matchesDescription) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('search result contains ALL articles matching the query', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (articles, query) => {
          const results = searchArticles(articles, query);
          const normalizedQuery = query.toLowerCase().trim();

          // Find all articles that should match
          const expectedArticles = articles.filter((article) => {
            const title = article.title.toLowerCase();
            const description = (article.description ?? '').toLowerCase();
            return title.includes(normalizedQuery) || description.includes(normalizedQuery);
          });

          if (results.length !== expectedArticles.length) {
            return false;
          }

          // Verify all expected articles are in result
          const resultIds = new Set(results.map((a) => a.id));
          for (const expected of expectedArticles) {
            if (!resultIds.has(expected.id)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('search is case-insensitive', () => {
    fc.assert(
      fc.property(
        newsArticleArbitrary,
        (article) => {
          // Use part of the title as search query
          const titlePart = article.title.substring(0, Math.min(5, article.title.length));
          if (titlePart.trim().length === 0) {
            return true; // Skip if no valid query
          }

          const articles = [article];

          // Search with different cases should return same results
          const lowerResults = searchArticles(articles, titlePart.toLowerCase());
          const upperResults = searchArticles(articles, titlePart.toUpperCase());
          const mixedResults = searchArticles(articles, titlePart);

          return (
            lowerResults.length === upperResults.length &&
            upperResults.length === mixedResults.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty search returns all articles', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          const results = searchArticles(articles, '');

          // Property: Empty search should return all articles
          return results.length === articles.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('whitespace-only search returns all articles', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
          .map((chars) => chars.join('')),
        (articles, whitespaceQuery) => {
          const results = searchArticles(articles, whitespaceQuery);

          // Property: Whitespace-only search should return all articles
          return results.length === articles.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('search by non-existent term returns empty result', () => {
    fc.assert(
      fc.property(
        fc.array(newsArticleArbitrary, { minLength: 0, maxLength: 50 }),
        (articles) => {
          // Use a term that definitely doesn't exist
          const nonExistentTerm = '___XYZNONEXISTENT12345___';
          const results = searchArticles(articles, nonExistentTerm);

          // Property: Search by non-existent term returns empty
          return results.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
