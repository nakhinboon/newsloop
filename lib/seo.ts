import type { Metadata } from "next";
import type { Post, LocalizedPost } from "./types";
import type { Locale } from "./i18n/config";
import { locales } from "./i18n/config";

/**
 * Base URL for the site - should be configured via environment variable in production
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

/**
 * Default site metadata
 */
export const defaultMetadata: Metadata = {
  title: {
    default: "Advanced Web Blog",
    template: "%s | Advanced Web Blog",
  },
  description: "A modern, performant blog platform built with Next.js featuring MDX content, i18n support, and SEO optimization.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Advanced Web Blog",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Generates metadata for a blog post page.
 * Requirements: 6.1
 */
export function generatePostMetadata(
  post: Post | LocalizedPost,
  locale: Locale
): Metadata {
  const url = `${siteUrl}/${locale}/blog/${post.slug}`;
  const publishedTime = post.publishedAt.toISOString();
  const modifiedTime = post.updatedAt?.toISOString();

  // Build alternate language links for hreflang
  const alternateLocales: Record<string, string> = {};
  if ("alternateLocales" in post && post.alternateLocales) {
    for (const alt of post.alternateLocales) {
      alternateLocales[alt.locale] = `${siteUrl}/${alt.locale}/blog/${alt.slug}`;
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url,
      publishedTime,
      modifiedTime,
      authors: [post.author.name],
      tags: post.tags,
      locale: locale,
      siteName: "Advanced Web Blog",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: url,
      languages: Object.keys(alternateLocales).length > 0 ? alternateLocales : undefined,
    },
  };
}

/**
 * Generates metadata for a category page.
 * Requirements: 6.1
 */
export function generateCategoryMetadata(
  category: string,
  locale: Locale,
  postCount: number
): Metadata {
  const title = `${category} - Category`;
  const description = `Browse ${postCount} posts in the ${category} category.`;
  const url = `${siteUrl}/${locale}/category/${encodeURIComponent(category.toLowerCase())}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale,
      siteName: "Advanced Web Blog",
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generates metadata for a tag page.
 * Requirements: 6.1
 */
export function generateTagMetadata(
  tag: string,
  locale: Locale,
  postCount: number
): Metadata {
  const title = `${tag} - Tag`;
  const description = `Browse ${postCount} posts tagged with ${tag}.`;
  const url = `${siteUrl}/${locale}/tag/${encodeURIComponent(tag.toLowerCase())}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale,
      siteName: "Advanced Web Blog",
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generates metadata for the search page.
 * Requirements: 6.1
 */
export function generateSearchMetadata(
  locale: Locale,
  query?: string
): Metadata {
  const title = query ? `Search: ${query}` : "Search";
  const description = query
    ? `Search results for "${query}" on Advanced Web Blog.`
    : "Search for blog posts on Advanced Web Blog.";
  const url = `${siteUrl}/${locale}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale,
      siteName: "Advanced Web Blog",
    },
    robots: {
      index: false, // Don't index search pages
      follow: true,
    },
  };
}

/**
 * Generates metadata for the homepage.
 * Requirements: 6.1
 */
export function generateHomeMetadata(locale: Locale): Metadata {
  const title = "Advanced Web Blog";
  const description = "A modern, performant blog platform built with Next.js featuring MDX content, i18n support, and SEO optimization.";
  const url = `${siteUrl}/${locale}`;

  // Build alternate language links
  const alternateLanguages: Record<string, string> = {};
  for (const loc of locales) {
    alternateLanguages[loc] = `${siteUrl}/${loc}`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale,
      siteName: "Advanced Web Blog",
    },
    alternates: {
      canonical: url,
      languages: alternateLanguages,
    },
  };
}

/**
 * Generates hreflang link tags for a post with multiple locale versions.
 * Requirements: 10.3
 */
export function generateHreflangTags(
  slug: string,
  availableLocales: { locale: Locale; slug: string }[]
): { locale: string; url: string }[] {
  return availableLocales.map((alt) => ({
    locale: alt.locale,
    url: `${siteUrl}/${alt.locale}/blog/${alt.slug}`,
  }));
}

/**
 * Gets the locale display name for Open Graph.
 */
export function getOGLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    en: "en_US",
    es: "es_ES",
    fr: "fr_FR",
    th: "th_TH",
  };
  return localeMap[locale] || "en_US";
}
