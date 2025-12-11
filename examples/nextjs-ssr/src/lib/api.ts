import type { CommentData } from '@threadkit/react';

const API_URL = process.env.THREADKIT_API_URL || 'http://localhost:8080/v1';
const PROJECT_ID = process.env.THREADKIT_PROJECT_ID || 'tk_pub_your_public_key';

/**
 * Fetch comments server-side for SSR.
 * This function runs on the server during page rendering.
 */
export async function fetchComments(pageUrl: string): Promise<CommentData[]> {
  try {
    const response = await fetch(
      `${API_URL}/comments?page_url=${encodeURIComponent(pageUrl)}`,
      {
        headers: {
          'X-API-Key': PROJECT_ID,
        },
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
