'use client';

import { ThreadKit, type CommentData } from '@threadkit/react';

interface CommentsSectionProps {
  siteId: string;
  url: string;
  initialComments: CommentData[];
}

export function CommentsSection({ siteId, url, initialComments }: CommentsSectionProps) {
  return (
    <ThreadKit
      siteId={siteId}
      url={url}
      initialComments={initialComments}
      apiUrl={process.env.NEXT_PUBLIC_THREADKIT_API_URL || 'https://api.usethreadkit.com'}
      theme="light"
      sortBy="newest"
    />
  );
}
