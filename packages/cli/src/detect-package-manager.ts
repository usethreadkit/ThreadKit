import * as fs from 'fs';
import * as path from 'path';

export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';

export function detectPackageManager(): PackageManager {
  const cwd = process.cwd();

  // Check for lockfiles in order of preference
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }

  if (fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock'))) {
    return 'bun';
  }

  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    return 'npm';
  }

  // Check for package.json packageManager field
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.packageManager) {
        if (packageJson.packageManager.startsWith('pnpm')) return 'pnpm';
        if (packageJson.packageManager.startsWith('yarn')) return 'yarn';
        if (packageJson.packageManager.startsWith('bun')) return 'bun';
        if (packageJson.packageManager.startsWith('npm')) return 'npm';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Default to npm
  return 'npm';
}

export function getInstallCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm add';
    case 'yarn':
      return 'yarn add';
    case 'bun':
      return 'bun add';
    case 'npm':
    default:
      return 'npm install';
  }
}
