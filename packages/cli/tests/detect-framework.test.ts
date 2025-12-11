import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectFramework } from '../src/detect-framework.js';

vi.mock('fs');
vi.mock('path');

describe('detectFramework', () => {
  const mockCwd = '/test/project';

  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when no package.json exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectFramework();
    expect(result).toBeNull();
  });

  it('detects Next.js App Router when app directory exists', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      if (p === `${mockCwd}/app`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'nextjs-app', name: 'Next.js (App Router)' });
  });

  it('detects Next.js App Router when src/app directory exists', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      if (p === `${mockCwd}/src/app`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'nextjs-app', name: 'Next.js (App Router)' });
  });

  it('detects Next.js Pages Router when pages directory exists', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      if (p === `${mockCwd}/pages`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'nextjs-pages', name: 'Next.js (Pages Router)' });
  });

  it('defaults to App Router for Next.js without app/pages directories', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'nextjs-app', name: 'Next.js (App Router)' });
  });

  it('detects SvelteKit', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { '@sveltejs/kit': '^2.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'sveltekit', name: 'SvelteKit' });
  });

  it('detects Svelte without Kit', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { svelte: '^4.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'svelte', name: 'Svelte' });
  });

  it('detects Remix', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { '@remix-run/react': '^2.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'remix', name: 'Remix' });
  });

  it('detects Astro', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { astro: '^4.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'astro', name: 'Astro' });
  });

  it('detects Gatsby', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { gatsby: '^5.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'gatsby', name: 'Gatsby' });
  });

  it('detects Vite + React', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { vite: '^5.0.0', react: '^18.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'vite-react', name: 'Vite + React' });
  });

  it('detects generic React', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { react: '^18.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'vite-react', name: 'React' });
  });

  it('returns unknown for unrecognized projects', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: { lodash: '^4.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'unknown', name: 'Unknown' });
  });

  it('checks devDependencies as well', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === `${mockCwd}/package.json`) return true;
      if (p === `${mockCwd}/app`) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        devDependencies: { next: '^14.0.0' },
      })
    );

    const result = await detectFramework();
    expect(result).toEqual({ type: 'nextjs-app', name: 'Next.js (App Router)' });
  });
});
