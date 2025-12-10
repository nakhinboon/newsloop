"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { Locale } from "@/lib/i18n/config";

interface Category {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface HeaderProps {
  locale: Locale;
  initialCategories?: Category[];
  activeParentSlug?: string; // For highlighting parent when on subcategory page
}

const SOCIAL_LINKS = [
  { name: "Facebook", icon: "facebook", url: "#" },
  { name: "X", icon: "x", url: "#" },
  { name: "Instagram", icon: "instagram", url: "#" },
  { name: "YouTube", icon: "youtube", url: "#" },
] as const;

function SocialIcon({ name }: { name: string }) {
  const className = "w-3.5 h-3.5 fill-current";
  switch (name.toLowerCase()) {
    case "facebook": return <svg className={className} viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>;
    case "x": return <svg className={className} viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case "instagram": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2"></line></svg>;
    case "youtube": return <svg className={className} viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>;
    default: return null;
  }
}

const MAX_NAV_CATEGORIES = 8;

// SSR-safe mount detection using useSyncExternalStore
const emptySubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export function Header({ locale, initialCategories = [], activeParentSlug }: HeaderProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isClient = useIsClient();
  const pathname = usePathname();

  // Check if current path matches a route
  const isActive = (href: string, categorySlug?: string) => {
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    // Check exact match first
    if (pathname === href || pathname === `${href}/`) {
      return true;
    }
    // Check if this category is the parent of current subcategory
    if (categorySlug && parentSlug === categorySlug) {
      return true;
    }
    return false;
  };

  // Format date only on client to avoid hydration mismatch
  const currentDate = isClient
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    : "";

  // Extract current category slug from pathname
  const currentCategorySlug = pathname.match(/\/category\/([^/]+)/)?.[1];
  const [fetchedParentSlug, setFetchedParentSlug] = useState<string | undefined>();

  // Use prop if provided, otherwise use fetched value
  const parentSlug = activeParentSlug ?? fetchedParentSlug;
  
  // Memoize root category slugs for efficient lookup
  const rootCategorySlugs = useMemo(
    () => new Set(categories.map(c => c.slug)),
    [categories]
  );

  useEffect(() => {
    if (initialCategories.length > 0) return;

    const controller = new AbortController();

    fetch('/api/categories', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Categories fetch failed:', err);
      });

    return () => controller.abort();
  }, [initialCategories.length]);

  // Fetch parent category when on a subcategory page
  useEffect(() => {
    // Skip if we have prop or no category slug - clear stale data
    if (activeParentSlug || !currentCategorySlug) {
      setFetchedParentSlug(undefined);
      return;
    }
    
    // Check if current slug is already a root category - no need to fetch
    if (rootCategorySlugs.has(currentCategorySlug)) {
      setFetchedParentSlug(undefined);
      return;
    }

    // Fetch parent info for subcategory
    const controller = new AbortController();
    fetch(`/api/categories/${currentCategorySlug}/parent`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => setFetchedParentSlug(data?.parentSlug ?? undefined))
      .catch(err => {
        if (err.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.warn('Parent category fetch failed:', err);
        }
      });

    return () => controller.abort();
  }, [currentCategorySlug, rootCategorySlugs, activeParentSlug]);

  return (
    <header className="w-full bg-white dark:bg-gray-950 font-sans sticky top-0 z-50">
      {/* Top Bar */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Social Icons */}
            <div className="hidden sm:flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  aria-label={link.name}
                >
                  <SocialIcon name={link.icon} />
                </a>
              ))}
            </div>

            {/* Center: Logo */}
            <div className="flex-1 flex justify-center sm:justify-center">
              <Link href={`/${locale}`} className="flex items-center gap-2 group">
                <span className="text-red-600 group-hover:scale-105 transition-transform duration-300">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5 7.5-3.21-1.79-1.79-5.71 5zm1.41-1.41 5.09-5.09L8 16zm5.68-6.18L13 7h-2v4l1.91 1.91z" />
                  </svg>
                </span>
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  <span className="text-red-600">NewsLoop</span>
                </span>
              </Link>
            </div>

            {/* Right: Search & Utilities */}
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/search`}
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-800 pl-3">
                <ThemeToggle />
                <LocaleSwitcher currentLocale={locale} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Hamburger Menu */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                ) : (
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                )}
              </svg>
            </button>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
              <Link
                href={`/${locale}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  isActive(`/${locale}`) && !pathname.includes('/category/')
                    ? "text-white bg-red-600 hover:bg-red-700"
                    : "text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                }`}
              >
                HOME
              </Link>
              {categories.slice(0, MAX_NAV_CATEGORIES).map((category) => {
                const categoryHref = `/${locale}/category/${category.slug}`;
                const isCategoryActive = isActive(categoryHref, category.slug);
                return (
                  <Link
                    key={category.id}
                    href={categoryHref}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap rounded transition-colors ${
                      isCategoryActive
                        ? "text-white bg-red-600 hover:bg-red-700"
                        : "text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                    }`}
                  >
                    {category.name}
                  </Link>
                );
              })}
              {categories.length > MAX_NAV_CATEGORIES && (
                <div className="relative group">
                  <button className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 uppercase tracking-wide flex items-center gap-1">
                    More
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-40">
                    {categories.slice(MAX_NAV_CATEGORIES).map((category) => (
                      <Link
                        key={category.id}
                        href={`/${locale}/category/${category.slug}`}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Date */}
            <div className="hidden lg:block text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {currentDate}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            <Link
              href={`/${locale}`}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 text-sm font-semibold rounded ${
                isActive(`/${locale}`) && !pathname.includes('/category/')
                  ? "text-white bg-red-600"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Home
            </Link>
            {categories.map((category) => {
              const categoryHref = `/${locale}/category/${category.slug}`;
              const isCategoryActive = isActive(categoryHref, category.slug);
              return (
                <Link
                  key={category.id}
                  href={categoryHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded ${
                    isCategoryActive
                      ? "text-white bg-red-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {category.name}
                  <span className="ml-2 text-xs text-gray-400">({category.postCount})</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
