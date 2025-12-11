'use client';

import { useEffect } from 'react';

interface PageViewTrackerProps {
  postId: string;
}

/**
 * Client component that tracks page views when a blog post is loaded.
 * Sends a POST request to the analytics API to record the view.
 */
export function PageViewTracker({ postId }: PageViewTrackerProps) {
  useEffect(() => {
    // Only track once per page load
    const trackView = async () => {
      try {
        await fetch('/api/analytics/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId }),
        });
      } catch (error) {
        // Silently fail - analytics should not break the page
        console.error('Failed to track page view:', error);
      }
    };

    trackView();
  }, [postId]);

  // This component doesn't render anything
  return null;
}
