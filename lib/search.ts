import type { Post, SearchResult } from "./types";
import { toPostPreview } from "./posts";

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a query is empty or contains only whitespace.
 */
function isEmptyQuery(query: string): boolean {
  return !query || query.trim().length === 0;
}

/**
 * Highlights matching terms in text by wrapping them in <mark> tags.
 * Requirements: 4.2
 */
export function highlightMatches(text: string, query: string): string {
  if (isEmptyQuery(query)) {
    return text;
  }

  const trimmedQuery = query.trim();
  const escapedQuery = escapeRegex(trimmedQuery);
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Searches posts by title, content, and tags.
 * Returns all posts if query is empty or whitespace.
 * Requirements: 4.1, 4.3
 */
export function search(query: string, posts: Post[]): SearchResult[] {
  // If query is empty or whitespace, return all posts without filtering
  if (isEmptyQuery(query)) {
    return posts.map((post) => ({
      post: toPostPreview(post),
      matchedIn: [] as ("title" | "content" | "tags")[],
      highlightedTitle: post.title,
      highlightedExcerpt: post.excerpt,
    }));
  }

  const trimmedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const post of posts) {
    const matchedIn: ("title" | "content" | "tags")[] = [];

    // Check title match (case-insensitive)
    if (post.title.toLowerCase().includes(trimmedQuery)) {
      matchedIn.push("title");
    }

    // Check content match (case-insensitive)
    if (post.content.toLowerCase().includes(trimmedQuery)) {
      matchedIn.push("content");
    }

    // Check tags match (case-insensitive)
    const hasTagMatch = post.tags.some((tag) =>
      tag.toLowerCase().includes(trimmedQuery)
    );
    if (hasTagMatch) {
      matchedIn.push("tags");
    }

    // Only include posts that have at least one match
    if (matchedIn.length > 0) {
      results.push({
        post: toPostPreview(post),
        matchedIn,
        highlightedTitle: highlightMatches(post.title, query),
        highlightedExcerpt: highlightMatches(post.excerpt, query),
      });
    }
  }

  return results;
}
