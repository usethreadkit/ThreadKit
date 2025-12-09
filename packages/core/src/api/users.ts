import type { UserPublic } from '../api.types';
import type { UserProfile } from '../types';

/**
 * Fetch a user's public profile by ID
 */
export async function getUser(
  apiUrl: string,
  projectId: string,
  userId: string,
  token?: string | null
): Promise<UserProfile> {
  const headers: Record<string, string> = {
    'projectid': projectId,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}/users/${userId}`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found');
    }
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const data: UserPublic = await response.json();

  // Transform backend response to frontend UserProfile format
  // Convert null to undefined for social links fields
  const socialLinks = data.social_links ? {
    twitter: data.social_links.twitter ?? undefined,
    github: data.social_links.github ?? undefined,
    facebook: data.social_links.facebook ?? undefined,
    whatsapp: data.social_links.whatsapp ?? undefined,
    telegram: data.social_links.telegram ?? undefined,
    instagram: data.social_links.instagram ?? undefined,
    tiktok: data.social_links.tiktok ?? undefined,
    snapchat: data.social_links.snapchat ?? undefined,
    discord: data.social_links.discord ?? undefined,
  } : undefined;

  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar_url ?? undefined,
    karma: data.karma,
    totalComments: data.total_comments,
    joinDate: new Date(data.created_at).getTime(), // Convert ISO string to ms timestamp
    socialLinks,
  };
}
