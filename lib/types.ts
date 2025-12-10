import type { Locale } from "./i18n/config";

// Author types
export interface Author {
  name: string;
  avatar?: string;
  bio?: string;
  social?: {
    twitter?: string;
    github?: string;
  };
}

// Full post with all content (HTML from TinyMCE stored in database)
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;        // HTML content from TinyMCE
  excerpt: string;
  author: Author;
  publishedAt: Date;
  updatedAt?: Date;
  category: string;
  tags: string[];
  readingTime: number;
  featured?: boolean;
  image?: string;
  locale: string;
  status: PostStatus;
}

// Post preview for listings
export interface PostPreview {
  slug: string;
  title: string;
  excerpt: string;
  author: Author;
  publishedAt: Date;
  category: string;
  readingTime: number;
  image?: string;
  featured?: boolean;
}


// Localized post extending base Post
export interface LocalizedPost extends Post {
  locale: Locale;
  alternateLocales: { locale: Locale; slug: string }[];
}

// Locale preference with source tracking
export interface LocalePreference {
  locale: Locale;
  source: "cookie" | "header" | "ip" | "default";
}

// Search result with match information
export interface SearchResult {
  post: PostPreview;
  matchedIn: ("title" | "content" | "tags")[];
  highlightedTitle: string;
  highlightedExcerpt: string;
}

// Category with post count
export interface Category {
  name: string;
  slug: string;
  postCount: number;
}

// Tag with post count
export interface Tag {
  name: string;
  slug: string;
  postCount: number;
}

// Admin types
export type PostStatus = "draft" | "scheduled" | "published";

export interface AdminPost extends Post {
  scheduledAt?: Date;
  createdAt: Date;
  viewCount: number;
}

export interface CreatePostInput {
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  locale: Locale;
  status: PostStatus;
  scheduledAt?: Date;
  authorId: string;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string;
}

// Media types
export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface PaginatedMedia {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Analytics types
export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  viewsThisWeek: number;
  popularPosts: PostWithViews[];
}

export interface ViewStats {
  total: number;
  byDate: { date: string; views: number }[];
}

export interface PostWithViews extends PostPreview {
  viewCount: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Session and User types
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor";
}

// Re-export Locale type for convenience
export type { Locale } from "./i18n/config";
