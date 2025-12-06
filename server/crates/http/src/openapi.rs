use utoipa::OpenApi;

use crate::routes::{admin, auth, comments, moderation, users};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "ThreadKit API",
        version = "1.0.0",
        description = "Comment system API for websites and applications",
        license(name = "MIT")
    ),
    servers(
        (url = "/v1", description = "API v1")
    ),
    tags(
        (name = "auth", description = "Authentication endpoints"),
        (name = "comments", description = "Comment CRUD and voting"),
        (name = "users", description = "User profile and settings"),
        (name = "notifications", description = "User notifications"),
        (name = "moderation", description = "Content moderation (moderator+)"),
        (name = "admin", description = "Site administration (admin+)")
    ),
    paths(
        // Auth
        auth::auth_methods,
        auth::send_otp,
        auth::verify_otp,
        auth::register,
        auth::login,
        auth::verify,
        auth::forgot_password,
        auth::reset_password,
        auth::refresh_token,
        auth::logout,
        auth::oauth_start,
        auth::oauth_callback,
        // Comments
        comments::get_comments,
        comments::create_comment,
        comments::update_comment,
        comments::delete_comment,
        comments::vote_comment,
        comments::report_comment,
        // Users
        users::get_me,
        users::update_me,
        users::delete_account,
        users::get_user,
        users::check_username,
        users::get_blocked_users,
        users::block_user,
        users::unblock_user,
        // Notifications
        users::get_notifications,
        users::mark_read,
        // Moderation
        moderation::get_queue,
        moderation::get_reports,
        moderation::approve_comment,
        moderation::reject_comment,
        moderation::ban_user,
        moderation::unban_user,
        moderation::shadowban_user,
        // Admin
        admin::get_admins,
        admin::add_admin,
        admin::remove_admin,
        admin::get_moderators,
        admin::add_moderator,
        admin::remove_moderator,
        admin::get_posting_status,
        admin::set_site_posting,
        admin::get_page_posting_status,
        admin::set_page_posting,
    ),
    components(
        schemas(
            // Common types
            threadkit_common::types::UserPublic,
            threadkit_common::types::Comment,
            threadkit_common::types::CommentStatus,
            threadkit_common::types::CommentWithAuthor,
            threadkit_common::types::VoteDirection,
            threadkit_common::types::SortOrder,
            threadkit_common::types::Notification,
            threadkit_common::types::NotificationType,
            threadkit_common::types::Report,
            threadkit_common::types::ReportReason,
            threadkit_common::types::DeletedAccountStats,
            // Auth types
            auth::AuthMethodsResponse,
            auth::AuthMethod,
            auth::SendOtpRequest,
            auth::VerifyOtpRequest,
            auth::RegisterRequest,
            auth::LoginRequest,
            auth::AuthResponse,
            auth::UserResponse,
            auth::VerifyRequest,
            auth::ForgotPasswordRequest,
            auth::ResetPasswordRequest,
            auth::RefreshRequest,
            // Comment types
            comments::GetCommentsResponse,
            comments::CreateCommentRequest,
            comments::CreateCommentResponse,
            comments::UpdateCommentRequest,
            comments::VoteRequest,
            comments::VoteResponse,
            comments::ReportRequest,
            // User types
            users::MeResponse,
            users::UpdateMeRequest,
            users::CheckUsernameRequest,
            users::CheckUsernameResponse,
            users::NotificationsResponse,
            users::NotificationWithDetails,
            users::BlockedUsersResponse,
            // Moderation types
            moderation::QueueResponse,
            moderation::ReportsResponse,
            moderation::ReportWithComment,
            // Admin types
            admin::RoleListResponse,
            admin::AddUserRequest,
            admin::PostingStatusResponse,
            admin::SetPostingRequest,
        )
    ),
    security(
        ("api_key" = []),
        ("secret_key" = []),
        ("bearer" = [])
    )
)]
pub struct ApiDoc;
