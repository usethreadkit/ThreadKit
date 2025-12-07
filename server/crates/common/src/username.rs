/// Username validation and normalization utilities.
///
/// Usernames must:
/// - Be 1-24 characters long
/// - Only contain alphanumeric characters, hyphens, and underscores
/// - Not start or end with a hyphen or underscore
/// - Not contain consecutive hyphens or underscores

/// Maximum username length
pub const MAX_USERNAME_LENGTH: usize = 24;

/// Minimum username length
pub const MIN_USERNAME_LENGTH: usize = 1;

/// Normalize a display name into a valid username.
/// Converts to lowercase, replaces spaces with hyphens, removes invalid characters.
pub fn normalize_username(name: &str) -> String {
    let mut result = String::with_capacity(name.len());
    let mut last_was_separator = true; // Prevent starting with separator

    for c in name.chars() {
        if c.is_ascii_alphanumeric() {
            result.push(c.to_ascii_lowercase());
            last_was_separator = false;
        } else if c == ' ' || c == '-' || c == '_' {
            // Convert spaces to hyphens, collapse consecutive separators
            if !last_was_separator && !result.is_empty() {
                result.push('-');
                last_was_separator = true;
            }
        }
        // Skip all other characters
    }

    // Remove trailing separator
    while result.ends_with('-') || result.ends_with('_') {
        result.pop();
    }

    // Truncate to max length
    if result.len() > MAX_USERNAME_LENGTH {
        result.truncate(MAX_USERNAME_LENGTH);
        // Make sure we didn't truncate mid-character (shouldn't happen with ASCII)
        while result.ends_with('-') || result.ends_with('_') {
            result.pop();
        }
    }

    result
}

/// Validate a username.
/// Returns Ok(()) if valid, Err with reason if invalid.
pub fn validate_username(username: &str) -> Result<(), &'static str> {
    if username.is_empty() {
        return Err("Username cannot be empty");
    }

    if username.len() > MAX_USERNAME_LENGTH {
        return Err("Username must be 24 characters or less");
    }

    if username.len() < MIN_USERNAME_LENGTH {
        return Err("Username cannot be empty");
    }

    // Check for valid characters
    for c in username.chars() {
        if !c.is_ascii_alphanumeric() && c != '-' && c != '_' {
            return Err("Username can only contain letters, numbers, hyphens, and underscores");
        }
    }

    // Check for leading/trailing separators
    let first_char = username.chars().next().unwrap();
    let last_char = username.chars().last().unwrap();

    if first_char == '-' || first_char == '_' {
        return Err("Username cannot start with a hyphen or underscore");
    }

    if last_char == '-' || last_char == '_' {
        return Err("Username cannot end with a hyphen or underscore");
    }

    // Check for consecutive separators
    let mut prev_was_separator = false;
    for c in username.chars() {
        let is_separator = c == '-' || c == '_';
        if is_separator && prev_was_separator {
            return Err("Username cannot have consecutive hyphens or underscores");
        }
        prev_was_separator = is_separator;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_username() {
        // Basic normalization
        assert_eq!(normalize_username("John Smith"), "john-smith");
        assert_eq!(normalize_username("John  Smith"), "john-smith"); // Collapse spaces
        assert_eq!(normalize_username("UPPERCASE"), "uppercase");

        // Special characters removed
        assert_eq!(normalize_username("user@email.com"), "useremailcom");
        assert_eq!(normalize_username("hello!world"), "helloworld");
        assert_eq!(normalize_username("test.user"), "testuser");

        // Preserve hyphens and underscores
        assert_eq!(normalize_username("test-user"), "test-user");
        assert_eq!(normalize_username("test_user"), "test-user"); // Underscore becomes hyphen

        // Leading/trailing spaces
        assert_eq!(normalize_username("  john  "), "john");
        assert_eq!(normalize_username("--test--"), "test");
    }

    #[test]
    fn test_validate_username() {
        // Valid usernames
        assert!(validate_username("john").is_ok());
        assert!(validate_username("john-smith").is_ok());
        assert!(validate_username("john_smith").is_ok());
        assert!(validate_username("john123").is_ok());
        assert!(validate_username("ab").is_ok());
        assert!(validate_username("a").is_ok()); // Single char is valid

        // Invalid usernames
        assert!(validate_username("").is_err()); // Empty
        assert!(validate_username("-john").is_err()); // Leading hyphen
        assert!(validate_username("john-").is_err()); // Trailing hyphen
        assert!(validate_username("john--smith").is_err()); // Consecutive hyphens
        assert!(validate_username("john@smith").is_err()); // Invalid char
        assert!(validate_username("john smith").is_err()); // Space
    }
}
