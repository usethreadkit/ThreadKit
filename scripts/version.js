#!/usr/bin/env node

/**
 * Unified versioning script for ThreadKit monorepo.
 * Bumps all package versions to the same version.
 *
 * Usage:
 *   node scripts/version.js 0.2.0          # Set specific version
 *   node scripts/version.js minor          # Bump minor (0.1.0 -> 0.2.0)
 *   node scripts/version.js patch          # Bump patch (0.1.0 -> 0.1.1)
 *   node scripts/version.js major          # Bump major (0.1.0 -> 1.0.0)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

// Get all package.json files
const packageDirs = fs.readdirSync(packagesDir).filter(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  return fs.existsSync(pkgPath);
});

// Get current version from core package
const corePackage = JSON.parse(
  fs.readFileSync(path.join(packagesDir, 'core', 'package.json'), 'utf8')
);
const currentVersion = corePackage.version;

// Parse version argument
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/version.js <version|major|minor|patch>');
  console.error(`Current version: ${currentVersion}`);
  process.exit(1);
}

// Calculate new version
let newVersion;
if (arg === 'major' || arg === 'minor' || arg === 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  if (arg === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else if (arg === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else if (arg === 'patch') {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }
} else {
  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(arg)) {
    console.error('Error: Version must be in format X.Y.Z (e.g., 0.2.0)');
    process.exit(1);
  }
  newVersion = arg;
}

console.log(`🔄 Bumping all packages from ${currentVersion} to ${newVersion}\n`);

// Update all package.json files
let updated = 0;
for (const dir of packageDirs) {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const oldVersion = pkg.version;
  pkg.version = newVersion;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${pkg.name}: ${oldVersion} → ${newVersion}`);
  updated++;
}

console.log(`\n✅ Updated ${updated} packages to version ${newVersion}`);
console.log('\nNext steps:');
console.log('  1. Review changes: git diff');
console.log('  2. Build packages: pnpm build');
console.log('  3. Commit: git add -A && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('  4. Tag: git tag v' + newVersion);
console.log('  5. Push: git push && git push --tags');
console.log('  6. Publish: pnpm -r publish --access public');
