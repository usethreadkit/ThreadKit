//! Content moderation using OpenAI-compatible APIs
//!
//! Supports any OpenAI-compatible moderation API (e.g., Groq's gpt-oss-safeguard-20b)

use crate::config::ContentModerationConfig;
use crate::types::{ContentModerationSettings, ModerationCategories, ModerationResult};
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Client for content moderation API calls
#[derive(Clone)]
pub struct ModerationClient {
    client: Client,
    config: ContentModerationConfig,
}

impl ModerationClient {
    /// Create a new moderation client from config
    pub fn new(config: ContentModerationConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()?;

        Ok(Self { client, config })
    }

    /// Check if moderation is enabled and configured
    pub fn is_enabled(&self) -> bool {
        self.config.enabled
            && self.config.api_url.is_some()
            && self.config.api_key.is_some()
            && self.config.model.is_some()
    }

    /// Moderate content and return categorized results
    pub async fn moderate(&self, content: &str) -> Result<ModerationResult> {
        if !self.is_enabled() {
            return Ok(ModerationResult {
                flagged: false,
                categories: ModerationCategories::default(),
                reason: None,
            });
        }

        let api_url = self.config.api_url.as_ref().unwrap();
        let api_key = self.config.api_key.as_ref().unwrap();
        let model = self.config.model.as_ref().unwrap();

        // Build the moderation endpoint URL
        let url = format!("{}/moderations", api_url.trim_end_matches('/'));

        let request = ModerationRequest {
            input: content.to_string(),
            model: model.clone(),
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            tracing::error!(status = %status, body = %body, "Moderation API error");
            return Err(anyhow!("Moderation API error: {} - {}", status, body));
        }

        let api_response: ModerationResponse = response.json().await?;

        // Convert API response to our format
        let result = api_response.results.first().ok_or_else(|| {
            anyhow!("No moderation results returned")
        })?;

        let categories = self.map_categories(&result.category_scores);
        let flagged = result.flagged;
        let reason = if flagged {
            Some(self.get_flagged_reason(&result.categories))
        } else {
            None
        };

        Ok(ModerationResult {
            flagged,
            categories,
            reason,
        })
    }

    /// Check content against site-specific moderation settings
    pub async fn check(
        &self,
        content: &str,
        settings: &ContentModerationSettings,
    ) -> Result<ModerationCheckResult> {
        // If moderation is disabled globally or for this site, allow
        if !self.is_enabled() || !settings.enabled {
            return Ok(ModerationCheckResult::Allowed);
        }

        let result = self.moderate(content).await?;

        // Check if any blocked category exceeds threshold
        if let Some(blocked_category) = result.categories.is_blocked(
            settings.confidence_threshold,
            &settings.blocked_categories,
        ) {
            tracing::info!(
                category = %blocked_category,
                threshold = settings.confidence_threshold,
                "Content flagged by moderation"
            );
            return Ok(ModerationCheckResult::Blocked {
                category: blocked_category,
                result,
            });
        }

        Ok(ModerationCheckResult::Allowed)
    }

    /// Map OpenAI moderation categories to our categories
    fn map_categories(&self, scores: &CategoryScores) -> ModerationCategories {
        ModerationCategories {
            hate_speech: scores.hate.max(scores.hate_threatening),
            harassment: scores.harassment.max(scores.harassment_threatening),
            sexual_content: scores.sexual.max(scores.sexual_minors),
            violence: scores.violence.max(scores.violence_graphic),
            self_harm: scores
                .self_harm
                .max(scores.self_harm_intent)
                .max(scores.self_harm_instructions),
            // OpenAI doesn't have spam category, so we default to 0
            spam: 0.0,
            // Map illicit to illegal_activity
            illegal_activity: scores.illicit.max(scores.illicit_violent),
        }
    }

    /// Get human-readable reason for flagged content
    fn get_flagged_reason(&self, categories: &Categories) -> String {
        let mut reasons = Vec::new();

        if categories.hate || categories.hate_threatening {
            reasons.push("hate speech");
        }
        if categories.harassment || categories.harassment_threatening {
            reasons.push("harassment");
        }
        if categories.sexual || categories.sexual_minors {
            reasons.push("sexual content");
        }
        if categories.violence || categories.violence_graphic {
            reasons.push("violence");
        }
        if categories.self_harm || categories.self_harm_intent || categories.self_harm_instructions
        {
            reasons.push("self-harm");
        }
        if categories.illicit || categories.illicit_violent {
            reasons.push("illegal activity");
        }

        if reasons.is_empty() {
            "content policy violation".to_string()
        } else {
            reasons.join(", ")
        }
    }
}

/// Result of moderation check against site settings
#[derive(Debug)]
pub enum ModerationCheckResult {
    /// Content is allowed
    Allowed,
    /// Content is blocked
    Blocked {
        category: String,
        result: ModerationResult,
    },
}

// ============================================================================
// OpenAI Moderation API Types
// ============================================================================

#[derive(Debug, Serialize)]
struct ModerationRequest {
    input: String,
    model: String,
}

#[derive(Debug, Deserialize)]
struct ModerationResponse {
    results: Vec<ModerationResultItem>,
}

#[derive(Debug, Deserialize)]
struct ModerationResultItem {
    flagged: bool,
    categories: Categories,
    category_scores: CategoryScores,
}

#[derive(Debug, Deserialize)]
struct Categories {
    #[serde(default)]
    hate: bool,
    #[serde(rename = "hate/threatening", default)]
    hate_threatening: bool,
    #[serde(default)]
    harassment: bool,
    #[serde(rename = "harassment/threatening", default)]
    harassment_threatening: bool,
    #[serde(default)]
    sexual: bool,
    #[serde(rename = "sexual/minors", default)]
    sexual_minors: bool,
    #[serde(default)]
    violence: bool,
    #[serde(rename = "violence/graphic", default)]
    violence_graphic: bool,
    #[serde(rename = "self-harm", default)]
    self_harm: bool,
    #[serde(rename = "self-harm/intent", default)]
    self_harm_intent: bool,
    #[serde(rename = "self-harm/instructions", default)]
    self_harm_instructions: bool,
    #[serde(default)]
    illicit: bool,
    #[serde(rename = "illicit/violent", default)]
    illicit_violent: bool,
}

#[derive(Debug, Deserialize)]
struct CategoryScores {
    #[serde(default)]
    hate: f32,
    #[serde(rename = "hate/threatening", default)]
    hate_threatening: f32,
    #[serde(default)]
    harassment: f32,
    #[serde(rename = "harassment/threatening", default)]
    harassment_threatening: f32,
    #[serde(default)]
    sexual: f32,
    #[serde(rename = "sexual/minors", default)]
    sexual_minors: f32,
    #[serde(default)]
    violence: f32,
    #[serde(rename = "violence/graphic", default)]
    violence_graphic: f32,
    #[serde(rename = "self-harm", default)]
    self_harm: f32,
    #[serde(rename = "self-harm/intent", default)]
    self_harm_intent: f32,
    #[serde(rename = "self-harm/instructions", default)]
    self_harm_instructions: f32,
    #[serde(default)]
    illicit: f32,
    #[serde(rename = "illicit/violent", default)]
    illicit_violent: f32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::BlockedCategories;

    #[test]
    fn test_is_blocked_hate_speech() {
        let categories = ModerationCategories {
            hate_speech: 0.85,
            ..Default::default()
        };
        let blocked = BlockedCategories::default();
        assert_eq!(
            categories.is_blocked(0.7, &blocked),
            Some("hate_speech".to_string())
        );
    }

    #[test]
    fn test_is_blocked_below_threshold() {
        let categories = ModerationCategories {
            hate_speech: 0.5,
            ..Default::default()
        };
        let blocked = BlockedCategories::default();
        assert_eq!(categories.is_blocked(0.7, &blocked), None);
    }

    #[test]
    fn test_is_blocked_category_disabled() {
        let categories = ModerationCategories {
            hate_speech: 0.9,
            ..Default::default()
        };
        let blocked = BlockedCategories {
            hate_speech: false,
            ..Default::default()
        };
        assert_eq!(categories.is_blocked(0.7, &blocked), None);
    }
}
