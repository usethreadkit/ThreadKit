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
    this.sortBy = config.sortBy ?? 'top';

    // Initialize state
    if (config.initialComments && config.initialComments.length > 0) {
      this.state = {
        comments: sortComments(config.initialComments, this.sortBy),
        loading: false,
        error: null,
        pageId: null,
        pinnedIds: [],
      };
    } else {
      this.state = {
        comments: [],
        loading: false,
        error: null,
        pageId: null,
        pinnedIds: [],
      };
    }
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get the current state of the comment store.
   * @returns The complete state including comments, loading status, errors, and page ID
   * @example
   * ```ts
   * const state = commentStore.getState();
   * console.log(`Loaded ${state.comments.length} comments`);
   * if (state.error) {
   *   console.error('Error:', state.error.message);
   * }
   * ```
   */
  getState(): CommentStoreState {
    return this.state;
  }

  /**
   * Get all comments in the current tree structure.
   * @returns Array of root-level comments with nested children
   * @example
   * ```ts
   * const comments = commentStore.getComments();
   * comments.forEach(comment => {
   *   console.log(`${comment.userName}: ${comment.text}`);
   *   comment.children.forEach(reply => {
   *     console.log(`  └─ ${reply.userName}: ${reply.text}`);
   *   });
   * });
   * ```
   */
  getComments(): Comment[] {
    return this.state.comments;
  }

  /**
   * Get the current sort order.
   * @returns The current sort criteria ('top', 'new', 'controversial', or 'old')
   * @example
   * ```ts
   * const sortBy = commentStore.getSortBy();
   * console.log(`Currently sorting by: ${sortBy}`);
   * ```
   */
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
   * Fetch comments from the API for the configured page.
   * Sets loading state during the request and updates state with results or errors.
   * If user is authenticated, also fetches their votes in parallel.
   *
   * @throws {ThreadKitError} If the request fails or returns an error
   * @example
   * ```ts
   * try {
   *   await commentStore.fetch();
   *   console.log('Comments loaded successfully');
   * } catch (error) {
   *   if (error instanceof ThreadKitError) {
   *     if (error.code === 'SITE_NOT_FOUND') {
   *       console.error('Invalid site configuration');
   *     } else if (error.code === 'RATE_LIMITED') {
   *       console.error('Too many requests, please try again later');
   *     }
   *   }
   * }
   * ```
   */
  async fetch(): Promise<void> {
    try {
      this.setState({ loading: true, error: null });

      const { apiUrl, url, projectId } = this.config;
      const token = this.config.getToken();

      const headers: Record<string, string> = {
        'projectid': projectId,
      };

      // Fetch comments
      const commentsPromise = fetch(
        `${apiUrl}/comments?page_url=${encodeURIComponent(url)}&sort=${this.sortBy}`,
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

      // Convert pinned IDs from API format to frontend format
      const pinnedIds: Array<[string, number]> = ((data as any).pinned || []).map(
        ([id, timestamp]: [string, number]) => [id, timestamp]
      );

      this.setState({
        comments: sortComments(comments, this.sortBy),
        loading: false,
        pageId: data.page_id,
        pinnedIds,
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
   * Post a new comment or reply to the API.
   * Requires authentication. Use {@link addComment} to update local state after posting.
   *
   * @param text - The comment text content (markdown supported)
   * @param parentId - Optional ID of the parent comment for replies
   * @returns The newly created comment
   * @throws {ThreadKitError} If the request fails, user is not authenticated, or rate limited
   * @example
   * ```ts
   * // Post a root-level comment
   * const comment = await commentStore.post('Great article!');
   * commentStore.addComment(comment);
   *
   * // Post a reply
   * const reply = await commentStore.post('Thanks!', parentComment.id);
   * commentStore.addComment(reply);
   * ```
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
   * Vote on a comment (upvote or downvote).
   * Requires authentication. Use {@link updateComment} to update local state after voting.
   *
   * @param commentId - The ID of the comment to vote on
   * @param type - Vote direction: 'up' for upvote, 'down' for downvote
   * @returns Vote response with updated vote counts
   * @throws {ThreadKitError} If the request fails or user is not authenticated
   * @example
   * ```ts
   * // Upvote a comment
   * const result = await commentStore.vote(comment.id, 'up');
   * commentStore.updateComment(comment.id, {
   *   upvotes: result.upvotes,
   *   downvotes: result.downvotes,
   *   userVote: 'up'
   * });
   * ```
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
    console.log('[CommentStore] Edit called:', { commentId, newText });
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
      console.error('[CommentStore] Comment not found for ID:', commentId);
      throw new ThreadKitError('Comment not found', 'UNKNOWN');
    }

    console.log('[CommentStore] Sending edit request:', { commentId, path, url, apiUrl });
    const response = await fetch(`${apiUrl}/comments/${commentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        page_url: url,
        path,
        content: newText,
      }),
    });

    console.log('[CommentStore] Edit response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      console.error('[CommentStore] Edit failed:', error);
      throw error;
    }
    console.log('[CommentStore] Edit successful');
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
   * Add a comment to local state without calling the API.
   * Useful for optimistic updates after posting a comment.
   * Always sorts by 'newest' so user's own comments appear at the top.
   *
   * @param comment - The comment to add
   * @example
   * ```ts
   * // Optimistic update after posting
   * const newComment = await commentStore.post('Hello world!');
   * commentStore.addComment(newComment);
   * ```
   */
  addComment(comment: Comment): void {
    this.setState({
      comments: addToTree(this.state.comments, comment, 'new'),
    });
  }

  /**
   * Remove a comment from local state without calling the API.
   * Useful for optimistic updates after deleting a comment.
   *
   * @param commentId - The ID of the comment to remove
   * @example
   * ```ts
   * // Optimistic update after deletion
   * await commentStore.delete(commentId);
   * commentStore.removeComment(commentId);
   * ```
   */
  removeComment(commentId: string): void {
    this.setState({
      comments: removeFromTree(this.state.comments, commentId),
    });
  }

  /**
   * Update a comment's properties in local state without calling the API.
   * Useful for optimistic updates after editing, voting, or receiving WebSocket events.
   *
   * @param commentId - The ID of the comment to update
   * @param updates - Partial comment object with properties to update
   * @example
   * ```ts
   * // Update after voting
   * const result = await commentStore.vote(commentId, 'up');
   * commentStore.updateComment(commentId, {
   *   upvotes: result.upvotes,
   *   downvotes: result.downvotes,
   *   userVote: 'up'
   * });
   *
   * // Update after editing
   * await commentStore.edit(commentId, 'Updated text');
   * commentStore.updateComment(commentId, {
   *   text: 'Updated text',
   *   edited: true
   * });
   * ```
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
      console.log('[ThreadKit] Contains "origin"?', errorText?.toLowerCase().includes('origin'));
      console.log('[ThreadKit] Contains "unauthorized"?', errorText?.toLowerCase().includes('unauthorized'));

      if (errorText?.toLowerCase().includes('origin') && errorText?.toLowerCase().includes('not allowed')) {
        errorCode = 'INVALID_ORIGIN';
        errorMessage = errorText; // Use the server's origin error message
      } else if (errorText?.toLowerCase().includes('api key')) {
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
