import type { Post, LocalizedPost } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";

interface ArticleJsonLdProps {
  post: Post | LocalizedPost;
  locale: Locale;
}

/**
 * Generates Article schema JSON-LD structured data for blog posts.
 * Requirements: 6.2
 */
export function ArticleJsonLd({ post, locale }: ArticleJsonLdProps) {
  const url = `${siteUrl}/${locale}/blog/${post.slug}`;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author.name,
      ...(post.author.social?.twitter && {
        sameAs: [`https://twitter.com/${post.author.social.twitter}`],
      }),
      ...(post.author.social?.github && {
        sameAs: [`https://github.com/${post.author.social.github}`],
      }),
    },
    datePublished: post.publishedAt.toISOString(),
    ...(post.updatedAt && {
      dateModified: post.updatedAt.toISOString(),
    }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    publisher: {
      "@type": "Organization",
      name: "Advanced Web Blog",
      url: siteUrl,
    },
    inLanguage: locale,
    keywords: post.tags.join(", "),
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).filter(Boolean).length,
    timeRequired: `PT${post.readingTime}M`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface WebsiteJsonLdProps {
  locale: Locale;
}

/**
 * Generates Website schema JSON-LD for the homepage.
 */
export function WebsiteJsonLd({ locale }: WebsiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Advanced Web Blog",
    description: "A modern, performant blog platform built with Next.js",
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

/**
 * Generates BreadcrumbList schema JSON-LD for navigation.
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
