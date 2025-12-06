import { EventEmitter } from '../EventEmitter';
import type { Comment, CommentStoreState, SortBy, ThreadKitErrorCode } from '../types';
import { ThreadKitError } from '../types';
import {
  buildCommentTree,
  sortComments,
  addToTree,
  removeFromTree,
  updateInTree,
} from '../utils/commentTree';

// ============================================================================
// Configuration
// ============================================================================

export interface CommentStoreConfig {
  /** API base URL */
  apiUrl: string;
  /** Site ID from ThreadKit dashboard */
  siteId: string;
  /** Page URL/identifier for this comment thread */
  url: string;
  /** API key (public key) */
  apiKey?: string;
  /** Function to get the current auth token (injected, not hardcoded) */
  getToken: () => string | null;
  /** Function to get additional headers before posting (e.g., Turnstile token) */
  getPostHeaders?: () => Promise<Record<string, string>>;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
  /** Initial sort order */
  sortBy?: SortBy;
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
      const tree = buildCommentTree(config.initialComments);
      this.state = {
        comments: sortComments(tree, this.sortBy),
        loading: false,
        error: null,
      };
    } else {
      this.state = {
        comments: [],
        loading: false,
        error: null,
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

      const { apiUrl, siteId, url, apiKey } = this.config;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(
        `${apiUrl}/sites/${siteId}/comments?url=${encodeURIComponent(url)}`,
        { headers }
      );

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        throw error;
      }

      const data = await response.json();
      const tree = buildCommentTree(data.comments || []);
      this.setState({
        comments: sortComments(tree, this.sortBy),
        loading: false,
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
    const { apiUrl, siteId, url, apiKey } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get additional headers (e.g., Turnstile token)
    if (this.config.getPostHeaders) {
      const additionalHeaders = await this.config.getPostHeaders();
      Object.assign(headers, additionalHeaders);
    }

    const response = await fetch(`${apiUrl}/sites/${siteId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, text, parentId }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }

    const comment = await response.json();
    return comment;
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string): Promise<void> {
    const { apiUrl, apiKey } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw error;
    }
  }

  /**
   * Vote on a comment
   */
  async vote(commentId: string, type: 'up' | 'down'): Promise<void> {
    const { apiUrl, apiKey } = this.config;
    const token = this.config.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}/comments/${commentId}/vote`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type }),
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
   */
  addComment(comment: Comment): void {
    this.setState({
      comments: addToTree(this.state.comments, comment, this.sortBy),
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
      comments: updateInTree(this.state.comments, commentId, updates, this.sortBy),
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

  private async parseErrorResponse(response: Response): Promise<ThreadKitError> {
    let errorCode: ThreadKitErrorCode = 'UNKNOWN';
    let errorMessage = `Request failed: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }

      // Map HTTP status codes to error codes
      if (response.status === 404) {
        errorCode = 'SITE_NOT_FOUND';
        errorMessage =
          errorData.error || 'Site not found. Please check your siteId configuration.';
      } else if (response.status === 401 || response.status === 403) {
        errorCode = errorData.error?.includes('API key')
          ? 'INVALID_API_KEY'
          : 'UNAUTHORIZED';
      } else if (response.status === 429) {
        errorCode = 'RATE_LIMITED';
      }
    } catch {
      // Could not parse JSON error response
    }

    return new ThreadKitError(errorMessage, errorCode, response.status);
  }
}
