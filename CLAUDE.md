# Claude Code Guidelines for ThreadKit

## Development Rules

1. **No backwards compatibility hacks** - This project is in active development. Never add fallbacks, deprecated prop handling, or backwards compatibility code. Just make the change directly.

2. **No time estimates** - Don't provide time estimates for tasks.

3. **Direct changes only** - When making changes, just make them. Don't add migration paths, deprecation warnings, or support for old APIs.

4. **NEVER commit secrets or deployment configs** - The `server/deploy/` folder contains production secrets, OAuth credentials, and server-specific configs. It is in `.gitignore` for a reason. NEVER use `git add -f` to force-add these files. They are for local deployment use only and must never be pushed to the repository.
