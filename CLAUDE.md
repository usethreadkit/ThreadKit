# Claude Code Guidelines for ThreadKit

## Development Rules

1. **No backwards compatibility hacks** - This project is in active development. Never add fallbacks, deprecated prop handling, or backwards compatibility code. Just make the change directly.

2. **No time estimates** - Don't provide time estimates for tasks.

3. **Direct changes only** - When making changes, just make them. Don't add migration paths, deprecation warnings, or support for old APIs.

4. **NEVER commit secrets or deployment configs** - The `server/deploy/` folder contains production secrets, OAuth credentials, and server-specific configs. It is in `.gitignore` for a reason. NEVER use `git add -f` to force-add these files. They are for local deployment use only and must never be pushed to the repository.

## Versioning Strategy

ThreadKit uses **unified versioning** - all packages share the same version number.

### Version Management

Use these commands to bump versions:
- `pnpm version:minor` - Bump minor (0.1.0 → 0.2.0) for new features
- `pnpm version:patch` - Bump patch (0.1.0 → 0.1.1) for bug fixes
- `pnpm version 0.X.0` - Set specific version

### Pre-v1 Convention
- **0.X.0** - New features, improvements, new packages
- **0.X.Y** - Bug fixes, patches, documentation

### Internal Dependencies
All internal `@threadkit/*` dependencies use `workspace:*` protocol. During `pnpm publish`, these are automatically converted to actual version numbers (e.g., `"@threadkit/core": "0.1.0"`).

See `scripts/README.md` for full release workflow.
