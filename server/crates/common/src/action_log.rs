use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write as IoWrite;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

/// Action types for logging
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    CommentCreated,
    CommentEdited,
    CommentDeleted,
    CommentVoted,
    ReportCreated,
    UserBanned,
    UserUnbanned,
    UserShadowbanned,
    CommentApproved,
    CommentRejected,
    MediaUploaded,
    UserRegistered,
    OauthLogin,
}

impl std::fmt::Display for ActionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ActionType::CommentCreated => write!(f, "COMMENT"),
            ActionType::CommentEdited => write!(f, "EDIT"),
            ActionType::CommentDeleted => write!(f, "DELETE"),
            ActionType::CommentVoted => write!(f, "VOTE"),
            ActionType::ReportCreated => write!(f, "REPORT"),
            ActionType::UserBanned => write!(f, "BAN"),
            ActionType::UserUnbanned => write!(f, "UNBAN"),
            ActionType::UserShadowbanned => write!(f, "SHADOWBAN"),
            ActionType::CommentApproved => write!(f, "APPROVE"),
            ActionType::CommentRejected => write!(f, "REJECT"),
            ActionType::MediaUploaded => write!(f, "MEDIA"),
            ActionType::UserRegistered => write!(f, "REGISTER"),
            ActionType::OauthLogin => write!(f, "OAUTH"),
        }
    }
}

/// Structured action log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionLog {
    pub timestamp: String,
    pub action: ActionType,
    pub site_id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_email: Option<String>,
    pub page_url: Option<String>,
    pub page_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,
    pub content_preview: Option<String>,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// Action logger that writes to both debug logs and JSON file
pub struct ActionLogger {
    json_file: Option<Arc<Mutex<std::fs::File>>>,
}

impl ActionLogger {
    /// Create a new action logger
    ///
    /// If json_path is Some, JSON logs will be written to that file.
    /// Debug logs are always written via tracing::debug!
    pub fn new(json_path: Option<PathBuf>) -> anyhow::Result<Self> {
        let json_file = if let Some(path) = json_path {
            // Create parent directories if needed
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)?;

            Some(Arc::new(Mutex::new(file)))
        } else {
            None
        };

        Ok(ActionLogger { json_file })
    }

    /// Log an action
    pub fn log(&self, entry: ActionLog) {
        // Write concise debug log
        self.log_debug(&entry);

        // Write JSON log if configured
        if let Some(file) = &self.json_file {
            if let Err(e) = self.log_json(file, &entry) {
                tracing::warn!("Failed to write JSON action log: {}", e);
            }
        }
    }

    /// Write concise debug log in format:
    /// [ACTION] [user_id] [comment_id] | content or details
    fn log_debug(&self, entry: &ActionLog) {
        let user_id = entry
            .user_id
            .map(|id| id.to_string())
            .unwrap_or_else(|| "anonymous".to_string());

        let comment_id = entry
            .comment_id
            .map(|id| id.to_string())
            .unwrap_or_else(|| "-".to_string());

        let detail = match &entry.action {
            ActionType::CommentCreated | ActionType::CommentEdited => {
                entry.content_preview
                    .as_ref()
                    .map(|s| s.chars().take(100).collect::<String>())
                    .unwrap_or_else(|| "-".to_string())
            }
            ActionType::CommentVoted => {
                entry.metadata
                    .as_ref()
                    .and_then(|m| m.get("vote_type"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?")
                    .to_string()
            }
            ActionType::CommentDeleted => {
                // For deletes, just show the comment_id (already in the format)
                "deleted".to_string()
            }
            ActionType::MediaUploaded => {
                entry.metadata
                    .as_ref()
                    .and_then(|m| m.get("filename"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?")
                    .to_string()
            }
            ActionType::OauthLogin | ActionType::UserRegistered => {
                entry.metadata
                    .as_ref()
                    .and_then(|m| m.get("provider").or_else(|| m.get("method")))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?")
                    .to_string()
            }
            _ => "-".to_string(),
        };

        tracing::debug!(
            "[{}] [{}] [{}] | {}",
            entry.action,
            user_id,
            comment_id,
            detail
        );
    }

    /// Write JSON log entry
    fn log_json(&self, file: &Arc<Mutex<std::fs::File>>, entry: &ActionLog) -> anyhow::Result<()> {
        let json = serde_json::to_string(entry)?;
        let mut file = file.lock().unwrap();
        writeln!(file, "{}", json)?;
        file.flush()?;
        Ok(())
    }
}

/// Builder for ActionLog entries
pub struct ActionLogBuilder {
    action: ActionType,
    site_id: Uuid,
    user_id: Option<Uuid>,
    user_email: Option<String>,
    page_url: Option<String>,
    page_id: Option<Uuid>,
    comment_id: Option<Uuid>,
    content_preview: Option<String>,
    ip: Option<String>,
    user_agent: Option<String>,
    metadata: Option<serde_json::Value>,
}

impl ActionLogBuilder {
    pub fn new(action: ActionType, site_id: Uuid) -> Self {
        Self {
            action,
            site_id,
            user_id: None,
            user_email: None,
            page_url: None,
            page_id: None,
            comment_id: None,
            content_preview: None,
            ip: None,
            user_agent: None,
            metadata: None,
        }
    }

    pub fn user_id(mut self, user_id: Uuid) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn user_email(mut self, email: String) -> Self {
        self.user_email = Some(email);
        self
    }

    pub fn page_url(mut self, url: String) -> Self {
        self.page_url = Some(url);
        self
    }

    pub fn page_id(mut self, id: Uuid) -> Self {
        self.page_id = Some(id);
        self
    }

    pub fn comment_id(mut self, id: Uuid) -> Self {
        self.comment_id = Some(id);
        self
    }

    pub fn content_preview(mut self, content: String) -> Self {
        // Truncate to 200 chars for preview
        let preview = if content.len() > 200 {
            format!("{}...", &content[..200])
        } else {
            content
        };
        self.content_preview = Some(preview);
        self
    }

    pub fn ip(mut self, ip: String) -> Self {
        self.ip = Some(ip);
        self
    }

    pub fn user_agent(mut self, ua: String) -> Self {
        self.user_agent = Some(ua);
        self
    }

    pub fn metadata(mut self, meta: serde_json::Value) -> Self {
        self.metadata = Some(meta);
        self
    }

    pub fn build(self) -> ActionLog {
        ActionLog {
            timestamp: Utc::now().to_rfc3339(),
            action: self.action,
            site_id: self.site_id,
            user_id: self.user_id,
            user_email: self.user_email,
            page_url: self.page_url,
            page_id: self.page_id,
            comment_id: self.comment_id,
            content_preview: self.content_preview,
            ip: self.ip,
            user_agent: self.user_agent,
            metadata: self.metadata,
        }
    }
}
