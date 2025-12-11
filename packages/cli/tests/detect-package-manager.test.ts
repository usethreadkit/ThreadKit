import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectPackageManager, getInstallCommand } from '../src/detect-package-manager.js';

vi.mock('fs');
vi.mock('path');

describe('detectPackageManager', () => {
  const mockCwd = '/test/project';

  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('detects pnpm from lockfile', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/pnpm-lock.yaml`;
    });

    const result = detectPackageManager();
    expect(result).toBe('pnpm');
  });

  it('detects yarn from lockfile', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/yarn.lock`;
    });

    const result = detectPackageManager();
    expect(result).toBe('yarn');
  });

  it('detects bun from bun.lockb', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/bun.lockb`;
    });

    const result = detectPackageManager();
    expect(result).toBe('bun');
  });

  it('detects bun from bun.lock', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/bun.lock`;
    });

    const result = detectPackageManager();
    expect(result).toBe('bun');
  });

  it('detects npm from lockfile', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/package-lock.json`;
    });

    const result = detectPackageManager();
    expect(result).toBe('npm');
  });

  it('prefers pnpm over yarn when both exist', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/pnpm-lock.yaml` || p === `${mockCwd}/yarn.lock`;
    });

    const result = detectPackageManager();
    expect(result).toBe('pnpm');
  });

  it('detects pnpm from packageManager field', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/package.json`;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        packageManager: 'pnpm@8.0.0',
      })
    );

    const result = detectPackageManager();
    expect(result).toBe('pnpm');
  });

  it('detects yarn from packageManager field', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === `${mockCwd}/package.json`;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        packageManager: 'yarn@4.0.0',
      })
    );

    const result = detectPackageManager();
    expect(result).toBe('yarn');
  });

  it('defaults to npm when nothing detected', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectPackageManager();
    expect(result).toBe('npm');
  });
});

describe('getInstallCommand', () => {
  it('returns correct command for pnpm', () => {
    expect(getInstallCommand('pnpm')).toBe('pnpm add');
  });

  it('returns correct command for yarn', () => {
    expect(getInstallCommand('yarn')).toBe('yarn add');
  });

  it('returns correct command for bun', () => {
    expect(getInstallCommand('bun')).toBe('bun add');
  });

  it('returns correct command for npm', () => {
    expect(getInstallCommand('npm')).toBe('npm install');
  });
});
