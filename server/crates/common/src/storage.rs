use anyhow::{Context, Result};
use aws_config::Region;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::{BehaviorVersion, SharedCredentialsProvider};
use aws_sdk_s3::Client;
use bytes::Bytes;
use uuid::Uuid;

use crate::config::S3Config;

pub struct StorageClient {
    client: Client,
    bucket: String,
    public_url: String,
}

impl StorageClient {
    pub async fn new(config: &S3Config) -> Result<Self> {
        let credentials = Credentials::new(
            &config.access_key_id,
            &config.secret_access_key,
            None,
            None,
            "s3-storage",
        );

        let credentials_provider = SharedCredentialsProvider::new(credentials);

        let s3_config = aws_config::SdkConfig::builder()
            .credentials_provider(credentials_provider)
            .endpoint_url(&config.endpoint)
            .region(Region::new(config.region.clone()))
            .behavior_version(BehaviorVersion::latest())
            .build();

        let s3_client_config = aws_sdk_s3::config::Builder::from(&s3_config)
            .force_path_style(true)
            .build();

        let client = Client::from_conf(s3_client_config);

        Ok(StorageClient {
            client,
            bucket: config.bucket.clone(),
            public_url: config.public_url.clone(),
        })
    }

    /// Upload a file to S3
    ///
    /// # Arguments
    /// * `media_id` - UUID for the media file
    /// * `content_type` - MIME type of the file
    /// * `data` - File contents as bytes
    /// * `prefix` - Folder prefix ("avatars" or "media")
    ///
    /// # Returns
    /// Public URL of the uploaded file
    pub async fn upload_file(
        &self,
        media_id: Uuid,
        content_type: &str,
        data: Bytes,
        prefix: &str,
    ) -> Result<String> {
        let extension = mime_to_extension(content_type);
        let key = format!("{}/{}.{}", prefix, media_id, extension);

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .content_type(content_type)
            .body(data.into())
            .send()
            .await
            .context("Failed to upload file to S3")?;

        Ok(format!("{}/{}", self.public_url, key))
    }

    /// Delete a file from S3
    ///
    /// # Arguments
    /// * `url` - Public URL of the file to delete
    pub async fn delete_file(&self, url: &str) -> Result<()> {
        // Extract key from public URL
        let key = url
            .strip_prefix(&format!("{}/", self.public_url))
            .context("Invalid URL for this storage bucket")?;

        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .context("Failed to delete file from S3")?;

        Ok(())
    }
}

/// Convert MIME type to file extension
fn mime_to_extension(mime: &str) -> &str {
    match mime {
        // Images
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/svg+xml" => "svg",
        // Videos
        "video/mp4" => "mp4",
        "video/webm" => "webm",
        "video/quicktime" => "mov",
        // Audio
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" => "wav",
        "audio/ogg" => "ogg",
        // Fallback
        _ => "bin",
    }
}
