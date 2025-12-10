# ThreadKit Release Scripts

## Unified Versioning

ThreadKit uses **fixed/unified versioning** - all packages share the same version number. This makes it easier to understand which packages work together and simplifies the release process.

## Version Management

### Bump versions

```bash
# Bump minor version (0.1.0 -> 0.2.0) - for new features
pnpm version:minor

# Bump patch version (0.1.0 -> 0.1.1) - for bug fixes
pnpm version:patch

# Bump major version (0.1.0 -> 1.0.0) - for breaking changes
pnpm version:major

# Set specific version
pnpm version 0.5.0
```

### Versioning Strategy (Pre-v1)

Before v1.0.0, we use this convention:

- **0.X.0** - New features, improvements, new packages
- **0.X.Y** - Bug fixes, patches, documentation updates

### Release Workflow

1. **Make your changes** and commit them

2. **Bump version** (example: new feature)
   ```bash
   pnpm version:minor
   ```

3. **Review changes**
   ```bash
   git diff
   ```

4. **Build all packages**
   ```bash
   pnpm -r build
   ```

5. **Test** (optional but recommended)
   ```bash
   pnpm test
   ```

6. **Commit version bump**
   ```bash
   git add -A
   git commit -m "chore: bump version to 0.2.0"
   ```

7. **Tag the release**
   ```bash
   git tag v0.2.0
   ```

8. **Push to GitHub**
   ```bash
   git push
   git push --tags
   ```

9. **Publish to npm**
   ```bash
   pnpm -r publish --access public
   ```

### What happens during publish?

When you run `pnpm publish`, pnpm automatically:
- Converts `workspace:*` dependencies to actual version numbers (e.g., `"@threadkit/core": "0.1.0"`)
- Publishes each package with the correct dependencies
- Uploads to npm registry

## Example Release

Let's say you added RTL support and want to release v0.2.0:

```bash
# 1. Bump version
pnpm version:minor

# Output:
# ✓ @threadkit/core: 0.1.0 → 0.2.0
# ✓ @threadkit/react: 0.1.0 → 0.2.0
# ... (all packages)

# 2. Build
pnpm -r build

# 3. Commit
git add -A
git commit -m "chore: bump version to 0.2.0

Added RTL support for Arabic, Hebrew, and Persian languages"

# 4. Tag and push
git tag v0.2.0
git push && git push --tags

# 5. Publish
pnpm -r publish --access public
```

## Notes

- All packages always have the same version
- `workspace:*` dependencies are automatically converted to actual versions during publish
- Optional dependencies removed from React package - users install plugins as needed
- Pre-v1, breaking changes are allowed in minor versions (0.X.0)
