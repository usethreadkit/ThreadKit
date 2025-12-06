/**
 * Convenience type exports from the generated OpenAPI types.
 * These are extracted from the server's OpenAPI spec.
 *
 * To regenerate: pnpm --filter @threadkit/core generate:types
 */

import type { components, paths } from './api.generated';

// ============================================================================
// Schema Types (from server)
// ============================================================================

/** Compact comment stored in page tree (single-letter keys for bandwidth) */
export type TreeComment = components['schemas']['TreeComment'];

/** Page tree - all comments for a page */
export type PageTree = components['schemas']['PageTree'];

/** Response for GET /comments */
export type GetCommentsResponse = components['schemas']['GetCommentsResponse'];

/** Request to create a comment */
export type CreateCommentRequest = components['schemas']['CreateCommentRequest'];

/** Response when creating a comment */
export type CreateCommentResponse = components['schemas']['CreateCommentResponse'];

/** Request to update a comment */
export type UpdateCommentRequest = components['schemas']['UpdateCommentRequest'];

/** Request to delete a comment */
export type DeleteRequest = components['schemas']['DeleteRequest'];

/** Request to vote on a comment */
export type VoteRequest = components['schemas']['VoteRequest'];

/** Response after voting */
export type VoteResponse = components['schemas']['VoteResponse'];

/** Vote direction */
export type VoteDirection = components['schemas']['VoteDirection'];

/** Comment status */
export type CommentStatus = components['schemas']['CommentStatus'];

/** Sort order for comments */
export type SortOrder = components['schemas']['SortOrder'];

/** Report reason */
export type ReportReason = components['schemas']['ReportReason'];

/** Request to report a comment */
export type ReportRequest = components['schemas']['ReportRequest'];

// ============================================================================
// User Types
// ============================================================================

/** Public user info (visible to others) */
export type UserPublic = components['schemas']['UserPublic'];

/** User response from auth endpoints */
export type UserResponse = components['schemas']['UserResponse'];

/** Current user's full profile */
export type MeResponse = components['schemas']['MeResponse'];

/** Request to update current user */
export type UpdateMeRequest = components['schemas']['UpdateMeRequest'];

/** Check username availability */
export type CheckUsernameRequest = components['schemas']['CheckUsernameRequest'];
export type CheckUsernameResponse = components['schemas']['CheckUsernameResponse'];

// ============================================================================
// Auth Types
// ============================================================================

/** Auth method info */
export type AuthMethod = components['schemas']['AuthMethod'];

/** Available auth methods response */
export type AuthMethodsResponse = components['schemas']['AuthMethodsResponse'];

/** Auth response with tokens */
export type AuthResponse = components['schemas']['AuthResponse'];

/** Register request */
export type RegisterRequest = components['schemas']['RegisterRequest'];

/** Login request */
export type LoginRequest = components['schemas']['LoginRequest'];

/** Send OTP request */
export type SendOtpRequest = components['schemas']['SendOtpRequest'];

/** Verify OTP request */
export type VerifyOtpRequest = components['schemas']['VerifyOtpRequest'];

/** Refresh token request */
export type RefreshRequest = components['schemas']['RefreshRequest'];

/** Forgot password request */
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest'];

/** Reset password request */
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];

/** Verify email/phone request */
export type VerifyRequest = components['schemas']['VerifyRequest'];

// ============================================================================
// Notification Types
// ============================================================================

/** Notification */
export type Notification = components['schemas']['Notification'];

/** Notification with user details */
export type NotificationWithDetails = components['schemas']['NotificationWithDetails'];

/** Notification type */
export type NotificationType = components['schemas']['NotificationType'];

/** Notifications response */
export type NotificationsResponse = components['schemas']['NotificationsResponse'];

// ============================================================================
// Moderation Types
// ============================================================================

/** Moderation queue item */
export type QueueItem = components['schemas']['QueueItem'];

/** Moderation queue response */
export type QueueResponse = components['schemas']['QueueResponse'];

/** Report item */
export type ReportItem = components['schemas']['ReportItem'];

/** Reports response */
export type ReportsResponse = components['schemas']['ReportsResponse'];

/** Request to moderate a comment */
export type ModerateCommentRequest = components['schemas']['ModerateCommentRequest'];

/** Request to ban a user */
export type BanUserRequest = components['schemas']['BanUserRequest'];

/** Ban user response */
export type BanUserResponse = components['schemas']['BanUserResponse'];

// ============================================================================
// Admin Types
// ============================================================================

/** Role list response */
export type RoleListResponse = components['schemas']['RoleListResponse'];

/** Add user to role request */
export type AddUserRequest = components['schemas']['AddUserRequest'];

/** Posting status response */
export type PostingStatusResponse = components['schemas']['PostingStatusResponse'];

/** Set posting status request */
export type SetPostingRequest = components['schemas']['SetPostingRequest'];

/** Blocked users response */
export type BlockedUsersResponse = components['schemas']['BlockedUsersResponse'];

/** Deleted account stats */
export type DeletedAccountStats = components['schemas']['DeletedAccountStats'];

// ============================================================================
// Path Types (for type-safe API calls)
// ============================================================================

export type { paths, components };

// ============================================================================
// Special User IDs
// ============================================================================

/** Special UUID for deleted users: d0000000-0000-0000-0000-000000000000 */
export const DELETED_USER_ID = 'd0000000-0000-0000-0000-000000000000';

/** Special UUID for anonymous users: a0000000-0000-0000-0000-000000000000 */
export const ANONYMOUS_USER_ID = 'a0000000-0000-0000-0000-000000000000';
