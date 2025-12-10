import type { MetadataRoute } from "next";
import { getAllPosts, getAvailableLocales } from "@/lib/posts";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";

/**
 * Generates a sitemap with all published post URLs and alternate language URLs.
 * Requirements: 6.3, 10.4
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add homepage for each locale
  for (const locale of locales) {
    const alternateLanguages: Record<string, string> = {};
    for (const altLocale of locales) {
      alternateLanguages[altLocale] = `${siteUrl}/${altLocale}`;
    }

    sitemapEntries.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: alternateLanguages,
      },
    });
  }

  // Add blog posts with alternate language versions
  for (const post of posts) {
    const availableLocales = await getAvailableLocales(post.slug);
    
    // Build alternate language URLs for this post
    const alternateLanguages: Record<string, string> = {};
    for (const locale of availableLocales) {
      alternateLanguages[locale] = `${siteUrl}/${locale}/blog/${post.slug}`;
    }

    // Add entry for each available locale version
    for (const locale of availableLocales) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}/blog/${post.slug}`,
        lastModified: post.updatedAt || post.publishedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: alternateLanguages,
        },
      });
    }

    // If post only exists in default locale, still add entries for other locales
    // (they will show fallback content)
    if (availableLocales.length === 1 && availableLocales[0] === defaultLocale) {
      for (const locale of locales) {
        if (locale !== defaultLocale) {
          sitemapEntries.push({
            url: `${siteUrl}/${locale}/blog/${post.slug}`,
            lastModified: post.updatedAt || post.publishedAt,
            changeFrequency: "weekly",
            priority: 0.6, // Lower priority for fallback content
            alternates: {
              languages: {
                [defaultLocale]: `${siteUrl}/${defaultLocale}/blog/${post.slug}`,
              },
            },
          });
        }
      }
    }
  }

  // Add category pages
  const categories = new Set(posts.map((p) => p.category).filter(Boolean));
  for (const category of categories) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}/category/${encodeURIComponent(category.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  // Add tag pages
  const tags = new Set(posts.flatMap((p) => p.tags));
  for (const tag of tags) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}/tag/${encodeURIComponent(tag.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  // Add search page for each locale (noindex but included for completeness)
  for (const locale of locales) {
    sitemapEntries.push({
      url: `${siteUrl}/${locale}/search`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    });
  }

  return sitemapEntries;
}
