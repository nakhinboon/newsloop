"use client";

export interface PostContentProps {
  /** HTML content from TinyMCE editor */
  content: string;
}

/**
 * PostContent component renders HTML content from TinyMCE.
 * Content is sanitized on the server before storage.
 * Requirements: 2.1, 2.2
 */
export function PostContent({ content }: PostContentProps) {
  if (!content) {
    return (
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-gray-500">No content available.</p>
      </article>
    );
  }

  return (
    <article 
      className="prose prose-lg dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default PostContent;
