import type { Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";

interface HreflangTagsProps {
  slug: string;
  availableLocales: { locale: Locale; slug: string }[];
  currentLocale: Locale;
}

/**
 * Generates hreflang link tags for alternate language versions of a post.
 * Requirements: 10.3
 */
export function HreflangTags({
  slug,
  availableLocales,
  currentLocale: _currentLocale,
}: HreflangTagsProps) {
  if (availableLocales.length <= 1) {
    return null;
  }

  return (
    <>
      {availableLocales.map((alt) => (
        <link
          key={alt.locale}
          rel="alternate"
          hrefLang={alt.locale}
          href={`${siteUrl}/${alt.locale}/blog/${alt.slug}`}
        />
      ))}
      {/* x-default for language negotiation */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${siteUrl}/en/blog/${slug}`}
      />
    </>
  );
}

/**
 * Generates hreflang data for use in metadata alternates.
 * Returns an object suitable for Next.js Metadata alternates.languages
 */
export function generateHreflangAlternates(
  availableLocales: { locale: Locale; slug: string }[]
): Record<string, string> {
  const alternates: Record<string, string> = {};
  
  for (const alt of availableLocales) {
    alternates[alt.locale] = `${siteUrl}/${alt.locale}/blog/${alt.slug}`;
  }
  
  return alternates;
}
