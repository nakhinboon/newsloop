import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/db/prisma";
import type { Locale } from "@/lib/i18n/config";

const SOCIAL_LINKS = [
  { name: "Facebook", icon: "facebook", url: "#" },
  { name: "X", icon: "x", url: "#" },
  { name: "Instagram", icon: "instagram", url: "#" },
  { name: "YouTube", icon: "youtube", url: "#" },
];

interface FooterProps {
  locale: Locale;
}

async function getFooterData(locale: string) {
  try {
    const [recentPosts, categories] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'PUBLISHED', locale },
        include: {
          category: { select: { name: true, slug: true } },
          postMedia: {
            where: { isCover: true },
            include: { media: { select: { url: true } } },
            take: 1,
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      }),
      prisma.category.findMany({
        include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      recentPosts: recentPosts.map(post => ({
        slug: post.slug,
        title: post.title,
        publishedAt: post.publishedAt,
        image: post.postMedia[0]?.media?.url || null,
        category: post.category,
      })),
      categories: categories.map(cat => ({
        name: cat.name,
        slug: cat.slug,
        postCount: cat._count.posts,
      })),
    };
  } catch (error) {
    console.error('Error fetching footer data:', error);
    return { recentPosts: [], categories: [] };
  }
}

export async function Footer({ locale }: FooterProps) {
  const { recentPosts, categories } = await getFooterData(locale);
  
  const trendingPosts = recentPosts.slice(0, 3);
  const latestPosts = recentPosts.slice(3, 6);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const SocialIcon = ({ name }: { name: string }) => {
    const className = "w-4 h-4 fill-current";
    switch (name.toLowerCase()) {
      case "facebook": return <svg className={className} viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>;
      case "x": return <svg className={className} viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
      case "instagram": return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path></svg>;
      case "youtube": return <svg className={className} viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>;
      default: return null;
    }
  };

  return (
    <footer className="bg-gray-900 dark:bg-black text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: About & Social */}
          <div className="space-y-6">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <span className="text-red-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
              </span>
              <span className="text-xl font-bold">
                <span className="text-red-600">NewsLoop</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted source for the latest news, insights, and analysis across technology, business, and world events.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  className="p-2 bg-gray-800 hover:bg-red-600 rounded-full transition-colors"
                  aria-label={link.name}
                >
                  <SocialIcon name={link.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Trending Posts */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-gray-800 pb-3">
              Trending
            </h3>
            <div className="space-y-4">
              {trendingPosts.length > 0 ? trendingPosts.map((post) => (
                <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className="flex gap-3 group">
                  <div className="w-16 h-12 shrink-0 bg-gray-800 rounded overflow-hidden relative">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <time className="text-xs text-gray-500">{formatDate(post.publishedAt)}</time>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-gray-500">No posts yet</p>
              )}
            </div>
          </div>

          {/* Column 3: Latest Posts */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-gray-800 pb-3">
              Latest
            </h3>
            <div className="space-y-4">
              {latestPosts.length > 0 ? latestPosts.map((post) => (
                <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className="flex gap-3 group">
                  <div className="w-16 h-12 shrink-0 bg-gray-800 rounded overflow-hidden relative">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <time className="text-xs text-gray-500">{formatDate(post.publishedAt)}</time>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-gray-500">No posts yet</p>
              )}
            </div>
          </div>

          {/* Column 4: Categories */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-gray-800 pb-3">
              Categories
            </h3>
            <ul className="space-y-2">
              {categories.length > 0 ? categories.slice(0, 8).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/${locale}/category/${category.slug}`}
                    className="flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors py-1"
                  >
                    <span>{category.name}</span>
                    <span className="text-xs text-gray-600">({category.postCount})</span>
                  </Link>
                </li>
              )) : (
                <li className="text-sm text-gray-500">No categories yet</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} NewsLoop. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
              <Link href={`/${locale}/about`} className="hover:text-white transition-colors">About</Link>
              <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">Contact</Link>
              <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">Privacy</Link>
              <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
