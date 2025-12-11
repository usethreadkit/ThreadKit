use anyhow::{Context, Result};
use bytes::Bytes;
use image::{imageops::FilterType, ImageFormat};

// Security limits to prevent DoS attacks
pub const MAX_IMAGE_DIMENSION: u32 = 10_000; // 10,000px max width or height
pub const MAX_IMAGE_PIXELS: u64 = 25_000_000; // 25 megapixels total

// Default WebP compression quality (0-100, higher = better quality)
pub const DEFAULT_WEBP_QUALITY: f32 = 80.0;

/// Compression statistics
#[derive(Debug, Clone)]
pub struct CompressionStats {
    pub original_size: usize,
    pub compressed_size: usize,
    pub compression_ratio: f64,
    pub format: String,
}

/// Resize an image to fit within max_size x max_size, preserving aspect ratio
///
/// # Arguments
/// * `data` - Raw image data
/// * `max_size` - Maximum width/height in pixels
/// * `quality` - WebP quality (0-100, higher = better quality)
///
/// # Returns
/// Tuple of (resized WebP bytes, compression statistics)
pub fn resize_avatar(data: &[u8], max_size: u32, quality: f32) -> Result<(Bytes, CompressionStats)> {
    let original_size = data.len();
    let img = image::load_from_memory(data).context("Failed to decode image")?;

    // Resize to fit within max_size x max_size, preserving aspect ratio
    let resized = img.resize(max_size, max_size, FilterType::Lanczos3);

    // Convert to RGB8 for WebP encoding
    let rgb_image = resized.to_rgb8();
    let encoder = webp::Encoder::from_rgb(&rgb_image, resized.width(), resized.height());
    let encoded = encoder.encode(quality);

    let compressed_size = encoded.len();
    let compression_ratio = if original_size > 0 {
        ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    let stats = CompressionStats {
        original_size,
        compressed_size,
        compression_ratio,
        format: "webp".to_string(),
    };

    Ok((Bytes::from(encoded.to_vec()), stats))
}

/// Validate an image and extract metadata
///
/// # Arguments
/// * `data` - Raw image data
///
/// # Returns
/// (width, height, mime_type)
///
/// # Security
/// Rejects images with dimensions exceeding MAX_IMAGE_DIMENSION or total pixels exceeding MAX_IMAGE_PIXELS
/// to prevent DoS attacks from decompression bombs
pub fn validate_image(data: &[u8]) -> Result<(u32, u32, String)> {
    let img = image::load_from_memory(data).context("Failed to decode image")?;
    let format = image::guess_format(data).context("Failed to guess image format")?;

    let width = img.width();
    let height = img.height();

    // Validate dimensions to prevent DoS attacks
    if width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION {
        anyhow::bail!(
            "Image dimensions too large: {}x{} (max {}px per side)",
            width,
            height,
            MAX_IMAGE_DIMENSION
        );
    }

    let total_pixels = width as u64 * height as u64;
    if total_pixels > MAX_IMAGE_PIXELS {
        anyhow::bail!(
            "Image has too many pixels: {} (max {})",
            total_pixels,
            MAX_IMAGE_PIXELS
        );
    }

    Ok((width, height, format_to_mime_type(format)))
}

/// Convert any image to WebP format without resizing
///
/// # Arguments
/// * `data` - Raw image data
/// * `quality` - WebP quality (0-100, higher = better quality)
///
/// # Returns
/// Tuple of (WebP bytes, compression statistics)
pub fn convert_to_webp(data: &[u8], quality: f32) -> Result<(Bytes, CompressionStats)> {
    let original_size = data.len();
    let img = image::load_from_memory(data).context("Failed to decode image")?;

    // Convert to RGB8 for WebP encoding
    let rgb_image = img.to_rgb8();
    let encoder = webp::Encoder::from_rgb(&rgb_image, img.width(), img.height());
    let encoded = encoder.encode(quality);

    let compressed_size = encoded.len();
    let compression_ratio = if original_size > 0 {
        ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    let stats = CompressionStats {
        original_size,
        compressed_size,
        compression_ratio,
        format: "webp".to_string(),
    };

    Ok((Bytes::from(encoded.to_vec()), stats))
}

/// Validate that a MIME type is a safe, supported image format
///
/// Blocks SVG for security (can contain JavaScript)
pub fn is_safe_image_mime(mime_type: &str) -> bool {
    matches!(
        mime_type,
        "image/jpeg" | "image/jpg" | "image/png" | "image/webp" | "image/gif"
    )
}

/// Convert ImageFormat to MIME type
fn format_to_mime_type(format: ImageFormat) -> String {
    match format {
        ImageFormat::Jpeg => "image/jpeg",
        ImageFormat::Png => "image/png",
        ImageFormat::WebP => "image/webp",
        ImageFormat::Gif => "image/gif",
        _ => "image/unknown",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb};

    fn create_test_image(width: u32, height: u32) -> Vec<u8> {
        let img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::new(width, height);
        let mut output = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut output), ImageFormat::Png)
            .unwrap();
        output
    }

    #[test]
    fn test_validate_image_normal() {
        let data = create_test_image(1920, 1080);
        let result = validate_image(&data);
        assert!(result.is_ok());
        let (width, height, _) = result.unwrap();
        assert_eq!(width, 1920);
        assert_eq!(height, 1080);
    }

    #[test]
    fn test_validate_image_max_dimension_width() {
        let data = create_test_image(MAX_IMAGE_DIMENSION + 1, 100);
        let result = validate_image(&data);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("dimensions too large"));
    }

    #[test]
    fn test_validate_image_max_dimension_height() {
        let data = create_test_image(100, MAX_IMAGE_DIMENSION + 1);
        let result = validate_image(&data);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("dimensions too large"));
    }

    #[test]
    fn test_validate_image_max_pixels() {
        // Create an image that's under dimension limit but over pixel limit
        // 6000 x 5000 = 30,000,000 pixels > 25,000,000 limit
        let data = create_test_image(6000, 5000);
        let result = validate_image(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("too many pixels"));
    }

    #[test]
    fn test_validate_image_at_limits() {
        // Test at exact limits should pass
        // 5000 x 5000 = 25,000,000 pixels (at limit)
        let data = create_test_image(5000, 5000);
        let result = validate_image(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_is_safe_image_mime() {
        assert!(is_safe_image_mime("image/jpeg"));
        assert!(is_safe_image_mime("image/jpg"));
        assert!(is_safe_image_mime("image/png"));
        assert!(is_safe_image_mime("image/webp"));
        assert!(is_safe_image_mime("image/gif"));
        assert!(!is_safe_image_mime("image/svg+xml"));
        assert!(!is_safe_image_mime("image/svg"));
        assert!(!is_safe_image_mime("application/pdf"));
    }

    #[test]
    fn test_resize_avatar() {
        let data = create_test_image(800, 600);
        let result = resize_avatar(&data, 200, DEFAULT_WEBP_QUALITY);
        assert!(result.is_ok());
        let (bytes, stats) = result.unwrap();
        assert!(bytes.len() > 0);
        assert!(stats.compressed_size > 0);
        assert!(stats.compression_ratio >= 0.0);
    }

    #[test]
    fn test_convert_to_webp() {
        let data = create_test_image(400, 300);
        let result = convert_to_webp(&data, DEFAULT_WEBP_QUALITY);
        assert!(result.is_ok());
        let (bytes, stats) = result.unwrap();
        assert!(bytes.len() > 0);
        assert_eq!(stats.format, "webp");
        assert!(stats.original_size > 0);
        assert!(stats.compressed_size > 0);
    }
}
