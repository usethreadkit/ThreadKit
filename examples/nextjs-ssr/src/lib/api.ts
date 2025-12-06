import type { CommentData } from '@threadkit/react';

const API_URL = process.env.THREADKIT_API_URL || 'https://api.usethreadkit.com';

/**
 * Fetch comments server-side for SSR.
 * This function runs on the server during page rendering.
 */
export async function fetchComments(siteId: string, pageUrl: string): Promise<CommentData[]> {
  try {
    const response = await fetch(
      `${API_URL}/sites/${siteId}/comments?url=${encodeURIComponent(pageUrl)}`,
      {
        // Revalidate every 60 seconds (ISR)
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch comments: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error('Error fetching comments for SSR:', error);
    return [];
  }
}
