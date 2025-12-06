use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{Error, Result};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // user_id
    pub site_id: Uuid,    // which site this token is for
    pub exp: i64,         // expiry timestamp
    pub iat: i64,         // issued at
    pub session_id: Uuid, // for token revocation
}

pub fn create_token(
    user_id: Uuid,
    site_id: Uuid,
    session_id: Uuid,
    secret: &str,
    expiry_hours: u64,
) -> Result<String> {
    let now = Utc::now();
    let expiry = now + Duration::hours(expiry_hours as i64);

    let claims = Claims {
        sub: user_id,
        site_id,
        exp: expiry.timestamp(),
        iat: now.timestamp(),
        session_id,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| Error::Internal(format!("Failed to create token: {}", e)))
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| Error::Unauthorized)
}

pub fn hash_password(password: &str) -> Result<String> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| Error::Internal(format!("Failed to hash password: {}", e)))
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    use argon2::{
        password_hash::{PasswordHash, PasswordVerifier},
        Argon2,
    };

    let parsed_hash =
        PasswordHash::new(hash).map_err(|e| Error::Internal(format!("Invalid hash: {}", e)))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

pub fn generate_verification_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1_000_000))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_roundtrip() {
        let user_id = Uuid::now_v7();
        let site_id = Uuid::now_v7();
        let session_id = Uuid::now_v7();
        let secret = "test_secret";

        let token = create_token(user_id, site_id, session_id, secret, 24).unwrap();
        let claims = verify_token(&token, secret).unwrap();

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.site_id, site_id);
        assert_eq!(claims.session_id, session_id);
    }

    #[test]
    fn test_password_roundtrip() {
        let password = "test_password_123";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }
}
