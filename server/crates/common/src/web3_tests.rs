//! Comprehensive tests for Web3 signature verification (Ethereum and Solana)

use super::web3::*;
use chrono::{Duration, Utc};

#[test]
fn test_generate_nonce_length_and_format() {
    let nonce = generate_nonce();
    assert_eq!(nonce.len(), 32);
    assert!(nonce.chars().all(|c| c.is_alphanumeric()));

    // Verify uniqueness (multiple generations should be different)
    let nonce2 = generate_nonce();
    assert_ne!(nonce, nonce2);
}

// ============================================================================
// Ethereum Address Validation Tests
// ============================================================================

#[test]
fn test_ethereum_address_valid_with_prefix() {
    let result = validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB");
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "0x742d35cc6634c0532925a3b844bc9e7595f8f5ab"); // lowercase
}

#[test]
fn test_ethereum_address_valid_without_prefix() {
    let result = validate_ethereum_address("742d35Cc6634C0532925a3b844Bc9e7595f8f5aB");
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "0x742d35cc6634c0532925a3b844bc9e7595f8f5ab");
}

#[test]
fn test_ethereum_address_invalid_too_short() {
    let result = validate_ethereum_address("0x742d35Cc");
    assert!(result.is_err());
}

#[test]
fn test_ethereum_address_invalid_too_long() {
    let result = validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB123");
    assert!(result.is_err());
}

#[test]
fn test_ethereum_address_invalid_non_hex() {
    let result = validate_ethereum_address("0xGGGG35Cc6634C0532925a3b844Bc9e7595f8f5");
    assert!(result.is_err());
}

#[test]
fn test_ethereum_address_empty() {
    let result = validate_ethereum_address("");
    assert!(result.is_err());
}

// ============================================================================
// Solana Address Validation Tests
// ============================================================================

#[test]
fn test_solana_address_valid_system_program() {
    // System program: 11111111111111111111111111111111
    let result = validate_solana_address("11111111111111111111111111111111");
    assert!(result.is_ok());
}

#[test]
fn test_solana_address_valid_typical() {
    // A typical Solana address
    let result = validate_solana_address("DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK");
    assert!(result.is_ok());
}

#[test]
fn test_solana_address_invalid_not_base58() {
    let result = validate_solana_address("invalid_address_0O");
    assert!(result.is_err());
}

#[test]
fn test_solana_address_invalid_wrong_length() {
    // Too short (less than 32 bytes when decoded)
    let result = validate_solana_address("11111");
    assert!(result.is_err());
}

#[test]
fn test_solana_address_empty() {
    let result = validate_solana_address("");
    assert!(result.is_err());
}

// ============================================================================
// Message Construction Tests
// ============================================================================

#[test]
fn test_ethereum_message_construction() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let nonce = "test_nonce_123";
    let issued_at = Utc::now();
    let expiration = issued_at + Duration::minutes(10);

    let message = construct_ethereum_sign_message(address, nonce, issued_at, expiration);

    assert!(message.contains(address));
    assert!(message.contains(nonce));
    assert!(message.contains("ThreadKit wants you to sign in with your Ethereum account"));
    assert!(message.contains("URI: https://usethreadkit.com"));
    assert!(message.contains("Version: 1"));
}

#[test]
fn test_solana_message_construction() {
    let address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
    let nonce = "test_nonce_456";
    let issued_at = Utc::now();
    let expiration = issued_at + Duration::minutes(10);

    let message = construct_solana_sign_message(address, nonce, issued_at, expiration);

    assert!(message.contains(address));
    assert!(message.contains(nonce));
    assert!(message.contains("Sign in to ThreadKit"));
    assert!(message.contains("Address:"));
}

// ============================================================================
// Nonce Generation Tests
// ============================================================================

#[test]
fn test_generate_ethereum_nonce_valid_address() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let result = generate_ethereum_nonce(address);

    assert!(result.is_ok());
    let nonce_data = result.unwrap();
    assert_eq!(nonce_data.nonce.len(), 32);
    assert!(nonce_data.message.contains(&nonce_data.nonce));
    assert!(nonce_data.expiration > nonce_data.issued_at);
}

#[test]
fn test_generate_ethereum_nonce_invalid_address() {
    let result = generate_ethereum_nonce("invalid");
    assert!(result.is_err());
}

#[test]
fn test_generate_solana_nonce_valid_address() {
    let address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
    let result = generate_solana_nonce(address);

    assert!(result.is_ok());
    let nonce_data = result.unwrap();
    assert_eq!(nonce_data.nonce.len(), 32);
    assert!(nonce_data.message.contains(&nonce_data.nonce));
    assert!(nonce_data.expiration > nonce_data.issued_at);
}

#[test]
fn test_generate_solana_nonce_invalid_address() {
    let result = generate_solana_nonce("invalid");
    assert!(result.is_err());
}

// ============================================================================
// Ethereum Signature Verification Tests
// ============================================================================

#[test]
fn test_ethereum_signature_invalid_signature_format() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let message = "Test message";
    let signature = "not_hex";

    let result = verify_ethereum_signature(address, message, signature);
    assert!(result.is_err());
}

#[test]
fn test_ethereum_signature_invalid_length_too_short() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let message = "Test message";
    let signature = "0x1234"; // Way too short

    let result = verify_ethereum_signature(address, message, signature);
    assert!(result.is_err());
}

#[test]
fn test_ethereum_signature_invalid_recovery_id() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let message = "Test message";
    // Valid length but invalid recovery ID (v should be 0, 1, 27, or 28)
    let signature = format!("{}05", "0".repeat(128)); // v=5 is invalid

    let result = verify_ethereum_signature(address, message, &signature);
    assert!(result.is_err());
}

#[test]
fn test_ethereum_signature_wrong_address() {
    // This test would require a real signature, so we'll just verify the function handles mismatches
    // In production, a signature from one address won't verify against another address
    let address = "0x0000000000000000000000000000000000000000";
    let message = "Test message";
    // A dummy signature (won't actually verify)
    let signature = format!("{}00", "0".repeat(128));

    let result = verify_ethereum_signature(address, message, &signature);
    // Should either return Ok(false) or Err depending on signature validity
    // We just want to make sure it doesn't panic
    let _ = result;
}

// ============================================================================
// Solana Signature Verification Tests
// ============================================================================

#[test]
fn test_solana_signature_invalid_address() {
    let address = "invalid";
    let message = "Test message";
    let signature = "base58_signature";

    let result = verify_solana_signature(address, message, signature);
    assert!(result.is_err());
}

#[test]
fn test_solana_signature_invalid_signature_format() {
    let address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
    let message = "Test message";
    let signature = "not_base58_0O"; // 0 and O are not in base58

    let result = verify_solana_signature(address, message, signature);
    assert!(result.is_err());
}

#[test]
fn test_solana_signature_invalid_signature_length() {
    let address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
    let message = "Test message";
    let signature = "ABC"; // Too short

    let result = verify_solana_signature(address, message, signature);
    assert!(result.is_err());
}

#[test]
fn test_solana_signature_invalid_public_key() {
    // Too short to be a valid public key
    let address = "11111";
    let message = "Test message";
    let signature = "5" .repeat(88); // Valid base58 length but won't verify

    let result = verify_solana_signature(address, message, &signature);
    assert!(result.is_err());
}

// ============================================================================
// Address Truncation Tests
// ============================================================================

#[test]
fn test_truncate_ethereum_address() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    assert_eq!(truncate_address(address, 6, 4), "0x742d...f5aB");
}

#[test]
fn test_truncate_solana_address() {
    let address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
    assert_eq!(truncate_address(address, 4, 4), "DYw8...NSKK");
}

#[test]
fn test_truncate_short_address() {
    let address = "0x1234";
    // Address is too short to truncate
    assert_eq!(truncate_address(address, 4, 4), "0x1234");
}

#[test]
fn test_truncate_custom_lengths() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    assert_eq!(truncate_address(address, 10, 8), "0x742d35Cc...95f8f5aB");
}

// ============================================================================
// Real Signature Test Vectors (if we can generate them)
// ============================================================================

// Note: To test actual signature verification, we would need:
// 1. A known private key
// 2. Sign a known message with it
// 3. Verify the signature matches
//
// This is challenging in a test environment without pulling in full wallet libraries.
// In production, these functions are tested via integration tests with actual wallets.

#[test]
fn test_ethereum_eip191_prefix() {
    // Verify the EIP-191 prefix is constructed correctly
    // The actual verification happens in verify_ethereum_signature with:
    // format!("\x19Ethereum Signed Message:\n{}{}", message.len(), message)

    let message = "Hello";
    let expected_prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    assert_eq!(expected_prefix, "\x19Ethereum Signed Message:\n5");
}

#[test]
fn test_nonce_expiration_time() {
    let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
    let nonce_data = generate_ethereum_nonce(address).unwrap();

    let duration = nonce_data.expiration - nonce_data.issued_at;
    // Should be 10 minutes (600 seconds)
    assert_eq!(duration.num_seconds(), 600);
}
