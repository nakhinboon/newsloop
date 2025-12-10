import { notFound } from "next/navigation";
import { locales, isValidLocale, type Locale } from "@/lib/i18n/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import prisma from "@/lib/db/prisma";
import { postCache } from "@/lib/cache/posts";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Generate static params for all supported locales.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Fetch root categories for navigation (excludes subcategories)
 * Uses Redis cache for performance
 */
async function getCategories() {
  const cacheKey = "categories:nav:root";
  
  try {
    // Check cache first
    const cached = await postCache.get<{ id: string; name: string; slug: string; postCount: number }[]>(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
      orderBy: { name: 'asc' },
    });

    const result = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      postCount: cat._count.posts,
    }));

    // Cache for 5 minutes
    await postCache.set(cacheKey, result, 300);
    
    return result;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Locale layout with navigation and LocaleSwitcher.
 * Requirements: 9.2, 11.1
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const categories = await getCategories();

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={validLocale} initialCategories={categories} />
      <main className="flex-1">{children}</main>
      <Footer locale={validLocale} />
    </div>
  );
}
