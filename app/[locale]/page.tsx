import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { generateHomeMetadata } from "@/lib/seo";
import { WebsiteJsonLd } from "@/components/JsonLd";
import { HomepageClient } from "./HomepageClient";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Generate metadata for the homepage.
 * Requirements: 6.1 - SEO optimized metadata
 */
export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  return generateHomeMetadata(locale as Locale);
}

/**
 * Homepage with BBC-style layout
 * Server Component that fetches initial data and passes to client
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;

  // Fetch homepage data from API (server-side)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  let homepageData = null;
  let categories = [];

  try {
    // ไม่ filter locale - แสดง posts ทุกภาษารวมกัน
    const [featuredRes, categoriesRes] = await Promise.all([
      fetch(`${baseUrl}/api/posts/featured`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }),
      fetch(`${baseUrl}/api/categories?withPosts=true&limit=4`, {
        next: { revalidate: 300 },
      }),
    ]);

    if (featuredRes.ok) {
      homepageData = await featuredRes.json();
    }
    if (categoriesRes.ok) {
      categories = await categoriesRes.json();
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error);
  }

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <WebsiteJsonLd locale={validLocale} />

      <HomepageClient
        locale={validLocale}
        initialData={homepageData}
        categories={categories}
      />
    </>
  );
}
