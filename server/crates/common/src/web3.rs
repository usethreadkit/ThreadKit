//! Web3 authentication utilities for Ethereum and Solana signature verification.

use crate::{Error, Result};
use chrono::{DateTime, Duration, Utc};
use rand::Rng;

/// Generate a random nonce for signature verification
pub fn generate_nonce() -> String {
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| rng.sample(rand::distributions::Alphanumeric) as char)
        .collect()
}

/// Validate and normalize an Ethereum address
pub fn validate_ethereum_address(address: &str) -> Result<String> {
    let addr = address.strip_prefix("0x").unwrap_or(address);
    if addr.len() != 40 || !addr.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(Error::BadRequest("Invalid Ethereum address".into()));
    }
    Ok(format!("0x{}", addr.to_lowercase()))
}

/// Validate a Solana address (base58 encoded public key)
pub fn validate_solana_address(address: &str) -> Result<String> {
    let bytes = bs58::decode(address)
        .into_vec()
        .map_err(|_| Error::BadRequest("Invalid Solana address".into()))?;

    if bytes.len() != 32 {
        return Err(Error::BadRequest("Invalid Solana address length".into()));
    }
    Ok(address.to_string())
}

/// Construct the message to sign for Ethereum (SIWE-like format)
pub fn construct_ethereum_sign_message(
    address: &str,
    nonce: &str,
    issued_at: DateTime<Utc>,
    expiration: DateTime<Utc>,
) -> String {
    format!(
        "ThreadKit wants you to sign in with your Ethereum account:\n\
        {}\n\n\
        Sign in to ThreadKit\n\n\
        URI: https://usethreadkit.com\n\
        Version: 1\n\
        Nonce: {}\n\
        Issued At: {}\n\
        Expiration Time: {}",
        address,
        nonce,
        issued_at.to_rfc3339(),
        expiration.to_rfc3339()
    )
}

/// Construct the message to sign for Solana
pub fn construct_solana_sign_message(
    address: &str,
    nonce: &str,
    issued_at: DateTime<Utc>,
    expiration: DateTime<Utc>,
) -> String {
    format!(
        "Sign in to ThreadKit\n\n\
        Address: {}\n\
        Nonce: {}\n\
        Issued At: {}\n\
        Expires: {}",
        address,
        nonce,
        issued_at.to_rfc3339(),
        expiration.to_rfc3339()
    )
}

/// Generate nonce response data
pub struct NonceData {
    pub nonce: String,
    pub message: String,
    pub issued_at: DateTime<Utc>,
    pub expiration: DateTime<Utc>,
}

/// Generate a nonce and message for Ethereum signing
pub fn generate_ethereum_nonce(address: &str) -> Result<NonceData> {
    let address = validate_ethereum_address(address)?;
    let nonce = generate_nonce();
    let issued_at = Utc::now();
    let expiration = issued_at + Duration::minutes(10);
    let message = construct_ethereum_sign_message(&address, &nonce, issued_at, expiration);

    Ok(NonceData {
        nonce,
        message,
        issued_at,
        expiration,
    })
}

/// Generate a nonce and message for Solana signing
pub fn generate_solana_nonce(address: &str) -> Result<NonceData> {
    let address = validate_solana_address(address)?;
    let nonce = generate_nonce();
    let issued_at = Utc::now();
    let expiration = issued_at + Duration::minutes(10);
    let message = construct_solana_sign_message(&address, &nonce, issued_at, expiration);

    Ok(NonceData {
        nonce,
        message,
        issued_at,
        expiration,
    })
}

/// Verify an Ethereum signature using EIP-191 personal_sign format
pub fn verify_ethereum_signature(address: &str, message: &str, signature: &str) -> Result<bool> {
    use alloy_primitives::{Address, PrimitiveSignature};

    // Decode signature from hex
    let sig_hex = signature.strip_prefix("0x").unwrap_or(signature);
    let sig_bytes = hex::decode(sig_hex)
        .map_err(|_| Error::BadRequest("Invalid signature format".into()))?;

    if sig_bytes.len() != 65 {
        return Err(Error::BadRequest("Invalid signature length".into()));
    }

    // Parse signature components (r, s, v)
    let r: [u8; 32] = sig_bytes[0..32]
        .try_into()
        .map_err(|_| Error::BadRequest("Invalid signature".into()))?;
    let s: [u8; 32] = sig_bytes[32..64]
        .try_into()
        .map_err(|_| Error::BadRequest("Invalid signature".into()))?;

    // v is the recovery id, normalize it
    let v = match sig_bytes[64] {
        0 | 27 => false,
        1 | 28 => true,
        v => return Err(Error::BadRequest(format!("Invalid recovery id: {}", v))),
    };

    let signature = PrimitiveSignature::new(
        alloy_primitives::U256::from_be_bytes(r),
        alloy_primitives::U256::from_be_bytes(s),
        v,
    );

    // Hash the message with EIP-191 prefix
    let prefixed_message = format!("\x19Ethereum Signed Message:\n{}{}", message.len(), message);
    let message_hash = alloy_primitives::keccak256(prefixed_message.as_bytes());

    // Recover the address from the signature
    let recovered = signature
        .recover_address_from_prehash(&message_hash)
        .map_err(|_| Error::BadRequest("Could not recover address from signature".into()))?;

    // Parse expected address
    let expected: Address = address
        .parse()
        .map_err(|_| Error::BadRequest("Invalid address format".into()))?;

    Ok(recovered == expected)
}

/// Verify a Solana signature (Ed25519)
pub fn verify_solana_signature(address: &str, message: &str, signature: &str) -> Result<bool> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};

    // Decode public key from base58
    let pubkey_bytes = bs58::decode(address)
        .into_vec()
        .map_err(|_| Error::BadRequest("Invalid Solana address".into()))?;

    let pubkey_array: [u8; 32] = pubkey_bytes
        .try_into()
        .map_err(|_| Error::BadRequest("Invalid public key length".into()))?;

    let verifying_key = VerifyingKey::from_bytes(&pubkey_array)
        .map_err(|_| Error::BadRequest("Invalid public key".into()))?;

    // Decode signature from base58
    let sig_bytes = bs58::decode(signature)
        .into_vec()
        .map_err(|_| Error::BadRequest("Invalid signature format".into()))?;

    let sig_array: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| Error::BadRequest("Invalid signature length".into()))?;

    let signature = Signature::from_bytes(&sig_array);

    // Verify the signature
    Ok(verifying_key.verify(message.as_bytes(), &signature).is_ok())
}

/// Truncate a wallet address for display (e.g., "0x1234...5678")
pub fn truncate_address(address: &str, prefix_len: usize, suffix_len: usize) -> String {
    if address.len() <= prefix_len + suffix_len + 3 {
        return address.to_string();
    }
    format!(
        "{}...{}",
        &address[..prefix_len],
        &address[address.len() - suffix_len..]
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_ethereum_address() {
        // Valid addresses
        assert!(validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f8f5").is_err()); // too short
        assert!(validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB").is_ok());
        assert!(validate_ethereum_address("742d35Cc6634C0532925a3b844Bc9e7595f8f5aB").is_ok()); // without 0x

        // Invalid addresses
        assert!(validate_ethereum_address("0xGGGG").is_err()); // invalid hex
        assert!(validate_ethereum_address("not-an-address").is_err());
    }

    #[test]
    fn test_validate_solana_address() {
        // Valid Solana address (32 bytes base58)
        assert!(validate_solana_address("11111111111111111111111111111111").is_ok()); // System program

        // Invalid
        assert!(validate_solana_address("invalid").is_err());
    }

    #[test]
    fn test_generate_nonce() {
        let nonce = generate_nonce();
        assert_eq!(nonce.len(), 32);
        assert!(nonce.chars().all(|c| c.is_alphanumeric()));
    }

    #[test]
    fn test_truncate_address() {
        let eth_addr = "0x742d35Cc6634C0532925a3b844Bc9e7595f8f5aB";
        assert_eq!(truncate_address(eth_addr, 6, 4), "0x742d...f5aB");

        let sol_addr = "11111111111111111111111111111111";
        assert_eq!(truncate_address(sol_addr, 4, 4), "1111...1111");
    }
}
