'use client';

import { ThreadKit, type CommentData } from '@threadkit/react';

interface CommentsSectionProps {
  projectId: string;
  url: string;
  initialComments: CommentData[];
}

export function CommentsSection({ projectId, url, initialComments }: CommentsSectionProps) {
  return (
    <ThreadKit
      projectId={projectId}
      url={url}
      initialComments={initialComments}
      apiUrl={process.env.NEXT_PUBLIC_THREADKIT_API_URL || 'http://localhost:8080/v1'}
      wsUrl={process.env.NEXT_PUBLIC_THREADKIT_WS_URL || 'ws://localhost:8081'}
      theme="light"
      sortBy="new"
    />
  );
}
