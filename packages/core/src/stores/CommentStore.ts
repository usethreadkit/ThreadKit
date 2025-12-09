import { EventEmitter } from '../EventEmitter';
import type { Comment, CommentStoreState, SortBy, ThreadKitErrorCode } from '../types';
import { ThreadKitError } from '../types';
import type { GetCommentsResponse, CreateCommentResponse, VoteResponse } from '../api.types';
import {
  sortComments,
  addToTree,
  removeFromTree,
  updateInTree,
} from '../utils/commentTree';
import { pageTreeToComments, treeCommentToComment, getCommentPath, type VotesMap } from '../utils/treeConvert';

// ============================================================================
// Configuration
// ============================================================================

export interface CommentStoreConfig {
  /** API base URL */
  apiUrl: string;
  /** Page URL/identifier for this comment thread */
  url: string;
  /** API key (public key) - required */
  projectId: string;
  /** Function to get the current auth token (injected, not hardcoded) */
  getToken: () => string | null;
  /** Function to get the current user ID (for vote tracking) */
  getUserId?: () => string | null;
  /** Function to get additional headers before posting (e.g., Turnstile token) */
  getPostHeaders?: () => Promise<Record<string, string>>;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
  /** Initial sort order */
  sortBy?: SortBy;
  /**
   * @deprecated siteId is no longer needed - site is derived from API key
   */
  siteId?: string;
}

// ============================================================================
// Events
// ============================================================================

export interface CommentStoreEvents {
  stateChange: CommentStoreState;
}

// ============================================================================
// CommentStore Class
// ============================================================================

/**
 * Framework-agnostic comment state management.
 * Handles fetching, posting, voting, and local state mutations.
 */
export class CommentStore extends EventEmitter<CommentStoreEvents> {
  private state: CommentStoreState;
  private config: CommentStoreConfig;
  private sortBy: SortBy;

  constructor(config: CommentStoreConfig) {
    super();
    this.config = config;
    this.sortBy = config.sortBy ?? 'votes';

    // Initialize state
    if (config.initialComments && config.initialComments.length > 0) {
      this.state = {
        comments: sortComments(config.initialComments, this.sortBy),
        loading: false,
        error: null,
        pageId: null,
      };
    } else {
      this.state = {
        comments: [],
        loading: false,
        error: null,
        pageId: null,
      };
    }
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getState(): CommentStoreState {
    return this.state;
  }

  getComments(): Comment[] {
    return this.state.comments;
  }

  getSortBy(): SortBy {
    return this.sortBy;
  }

  // ============================================================================
  // State Updates
  // ============================================================================

  private setState(updates: Partial<CommentStoreState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
  }

  // ============================================================================
  // API Operations
  // ============================================================================

  /**
   * Fetch comments from the API
   */
  async fetch(): Promise<void> {
    try {
      this.setState({ loading: true, error: null });

      const { apiUrl, url, projectId } = this.config;
      const token = this.config.getToken();

      const headers: Record<string, string> = {
        'projectid': projectId,
      };

      // Map our SortBy to server's SortOrder
      const sortParam = this.mapSortByToSortOrder(this.sortBy);

      // Fetch comments
      const commentsPromise = fetch(
        `${apiUrl}/comments?page_url=${encodeURIComponent(url)}&sort=${sortParam}`,
        { headers }
      );

      // If authenticated, also fetch user's votes in parallel
      let votesPromise: Promise<Response> | null = null;
      if (token) {
        const votesHeaders: Record<string, string> = {
          'projectid': projectId,
          'Authorization': `Bearer ${token}`,
        };
        votesPromise = fetch(
          `${apiUrl}/pages/my_votes?page_url=${encodeURIComponent(url)}`,
          { headers: votesHeaders }
        );
      }

      // Wait for both requests
      const [commentsResponse, votesResponse] = await Promise.all([
        commentsPromise,
        votesPromise,
      ]);

      if (!commentsResponse.ok) {
        const error = await this.parseErrorResponse(commentsResponse);
        throw error;
      }

      // Parse votes if we got them (ignore errors - votes are optional)
      let votes: VotesMap | undefined;
      if (votesResponse?.ok) {
        try {
          const votesData: { votes: Record<string, string> } = await votesResponse.json();
          // Convert the server's format to VotesMap
          votes = {};
          for (const [commentId, direction] of Object.entries(votesData.votes)) {
            if (direction === 'up' || direction === 'down') {
              votes[commentId] = direction;
            }
          }
        } catch {
          // Ignore vote parsing errors
        }
      }

      const data: GetCommentsResponse = await commentsResponse.json();
      const comments = pageTreeToComments(data.tree, votes);

      this.setState({
        comments: sortComments(comments, this.sortBy),
        loading: false,
        pageId: data.page_id,
      });
    } catch (err) {
      const error =
        err instanceof ThreadKitError
          ? err
          : new ThreadKitError(
              err instanceof Error ? err.message : 'Failed to fetch comments',
              'UNKNOWN'
            );
      this.setState({ loading: false, error });
    }
  }

  /**
   * Post a new comment
   */
  async post(text: string, parentId?: string): Promise<Comment> {
    const { apiUrl, url, projectId } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'projectid': projectId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get additional headers (e.g., Turnstile token)
    if (this.config.getPostHeaders) {
      const additionalHeaders = await this.config.getPostHeaders();
      Object.assign(headers, additionalHeaders);
    }

    // Build the parent_path if replying to a comment
    let parentPath: string[] | undefined;
    if (parentId) {
      const path = getCommentPath(this.state.comments, parentId);
      if (path) {
        parentPath = path;
      } else {
        // If we can't find the path, just use the parentId directly
        parentPath = [parentId];
      }
    }

    const response = await fetch(`${apiUrl}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_url: url,
        content: text,
        parent_path: parentPath,
      }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }

    const data: CreateCommentResponse = await response.json();
    // Convert the TreeComment to our Comment format
    const comment = treeCommentToComment(data.comment, parentId);
    return comment;
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string): Promise<void> {
    const { apiUrl, url, projectId } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'projectid': projectId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get the path to the comment
    const path = getCommentPath(this.state.comments, commentId);
    if (!path) {
      throw new ThreadKitError('Comment not found', 'UNKNOWN');
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        page_url: url,
        path,
      }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }
  }

  /**
   * Vote on a comment
   */
  async vote(commentId: string, type: 'up' | 'down'): Promise<VoteResponse> {
    const { apiUrl, url, projectId } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'projectid': projectId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get the path to the comment
    const path = getCommentPath(this.state.comments, commentId);
    if (!path) {
      throw new ThreadKitError('Comment not found', 'UNKNOWN');
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}/vote`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_url: url,
        path,
        direction: type, // Server expects 'up' or 'down'
      }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }

    const data: VoteResponse = await response.json();
    return data;
  }

  /**
   * Edit a comment
   */
  async edit(commentId: string, newText: string): Promise<void> {
    const { apiUrl, url, projectId } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'projectid': projectId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get the path to the comment
    const path = getCommentPath(this.state.comments, commentId);
    if (!path) {
      throw new ThreadKitError('Comment not found', 'UNKNOWN');
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        page_url: url,
        path,
        content: newText,
      }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }
  }

  /**
   * Report a comment
   */
  async report(
    commentId: string,
    reason: 'spam' | 'harassment' | 'hate_speech' | 'misinformation' | 'other',
    details?: string
  ): Promise<void> {
    const { apiUrl, url, projectId } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'projectid': projectId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get the path to the comment
    const path = getCommentPath(this.state.comments, commentId);
    if (!path) {
      throw new ThreadKitError('Comment not found', 'UNKNOWN');
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_url: url,
        path,
        reason,
        details,
      }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }
  }

  // ============================================================================
  // Local State Mutations (for optimistic updates)
  // ============================================================================

  /**
   * Add a comment to local state (doesn't call API)
   * Always sorts by 'newest' so user's own comments appear at the top
   */
  addComment(comment: Comment): void {
    this.setState({
      comments: addToTree(this.state.comments, comment, 'newest'),
    });
  }

  /**
   * Remove a comment from local state (doesn't call API)
   */
  removeComment(commentId: string): void {
    this.setState({
      comments: removeFromTree(this.state.comments, commentId),
    });
  }

  /**
   * Update a comment in local state (doesn't call API)
   */
  updateComment(commentId: string, updates: Partial<Comment>): void {
    this.setState({
      comments: updateInTree(this.state.comments, commentId, updates),
    });
  }

  // ============================================================================
  // Sorting
  // ============================================================================

  /**
   * Change sort order and re-sort comments
   */
  setSortBy(sortBy: SortBy): void {
    this.sortBy = sortBy;
    this.setState({
      comments: sortComments(this.state.comments, sortBy),
    });
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Map our SortBy enum to the server's SortOrder enum
   */
  private mapSortByToSortOrder(sortBy: SortBy): string {
    switch (sortBy) {
      case 'newest':
        return 'new';
      case 'votes':
        return 'top';
      case 'oldest':
        return 'new'; // Server doesn't have oldest, we'll reverse client-side
      case 'controversial':
        return 'hot'; // Map to hot, closest equivalent
      default:
        return 'new';
    }
  }

  private async parseErrorResponse(response: Response): Promise<ThreadKitError> {
    let errorCode: ThreadKitErrorCode = 'UNKNOWN';
    let errorMessage = `Request failed: ${response.statusText}`;
    let errorText: string | null = null;

    // Try to read the response body as text first
    try {
      const text = await response.text();
      console.log('[ThreadKit] Error response body:', text);
      console.log('[ThreadKit] Error status:', response.status, response.statusText);

      if (text) {
        errorText = text;

        // Try to parse as JSON
        try {
          const errorData = JSON.parse(text);
          if (errorData.error) {
            errorText = errorData.error;
            errorMessage = errorData.error;
          }
        } catch {
          // Not JSON, use plain text
          errorMessage = text;
        }
      }
    } catch (e) {
      console.error('[ThreadKit] Failed to read error response:', e);
    }

    console.log('[ThreadKit] Parsed error text:', errorText);

    // Map HTTP status codes to error codes
    if (response.status === 404) {
      errorCode = 'SITE_NOT_FOUND';
      if (!errorText) {
        errorMessage = 'Page not found. Please check your configuration.';
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('[ThreadKit] Checking auth error. errorText:', errorText);
      console.log('[ThreadKit] Contains "api key"?', errorText?.toLowerCase().includes('api key'));
      console.log('[ThreadKit] Contains "unauthorized"?', errorText?.toLowerCase().includes('unauthorized'));

      if (errorText?.toLowerCase().includes('api key')) {
        errorCode = 'INVALID_API_KEY';
        errorMessage = 'Invalid API key. Please check your ThreadKit configuration and ensure your API keys are correct.';
      } else if (errorText?.toLowerCase().includes('unauthorized')) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Authentication required. Please check that your API keys are configured correctly in your ThreadKit setup.';
      } else {
        errorCode = 'UNAUTHORIZED';
      }
    } else if (response.status === 429) {
      errorCode = 'RATE_LIMITED';
    }

    console.log('[ThreadKit] Final error message:', errorMessage);
    console.log('[ThreadKit] Final error code:', errorCode);

    return new ThreadKitError(errorMessage, errorCode, response.status);
  }
}
