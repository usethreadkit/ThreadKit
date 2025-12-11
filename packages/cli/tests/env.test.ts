import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { updateEnvFile } from '../src/env.js';

vi.mock('fs');
vi.mock('path');

describe('updateEnvFile', () => {
  const mockCwd = '/test/project';

  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates new .env.local file for hosted setup', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.mocked(fs.writeFileSync);

    await updateEnvFile('tk_pub_test123', 'hosted');

    expect(writeSpy).toHaveBeenCalledWith(
      `${mockCwd}/.env.local`,
      expect.stringContaining('NEXT_PUBLIC_THREADKIT_PROJECT_ID=tk_pub_test123')
    );
  });

  it('creates .env.local with API URLs for self-hosted setup', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.mocked(fs.writeFileSync);

    await updateEnvFile('tk_pub_test123', 'self-hosted');

    const written = writeSpy.mock.calls[0][1] as string;
    expect(written).toContain('NEXT_PUBLIC_THREADKIT_PROJECT_ID=tk_pub_test123');
    expect(written).toContain('NEXT_PUBLIC_THREADKIT_API_URL=http://localhost:8080/v1');
    expect(written).toContain('NEXT_PUBLIC_THREADKIT_WS_URL=ws://localhost:8081');
  });

  it('appends to existing .env.local file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('EXISTING_VAR=value\n');
    const writeSpy = vi.mocked(fs.writeFileSync);

    await updateEnvFile('tk_pub_test123', 'hosted');

    const written = writeSpy.mock.calls[0][1] as string;
    expect(written).toContain('EXISTING_VAR=value');
    expect(written).toContain('NEXT_PUBLIC_THREADKIT_PROJECT_ID=tk_pub_test123');
  });

  it('updates existing THREADKIT_PROJECT_ID if present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      'EXISTING_VAR=value\nNEXT_PUBLIC_THREADKIT_PROJECT_ID=old_key\nOTHER_VAR=other\n'
    );
    const writeSpy = vi.mocked(fs.writeFileSync);

    await updateEnvFile('tk_pub_new_key', 'hosted');

    const written = writeSpy.mock.calls[0][1] as string;
    expect(written).toContain('NEXT_PUBLIC_THREADKIT_PROJECT_ID=tk_pub_new_key');
    expect(written).not.toContain('old_key');
    expect(written).toContain('EXISTING_VAR=value');
    expect(written).toContain('OTHER_VAR=other');
  });

  it('adds ThreadKit section header for new keys', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('EXISTING_VAR=value');
    const writeSpy = vi.mocked(fs.writeFileSync);

    await updateEnvFile('tk_pub_test123', 'hosted');

    const written = writeSpy.mock.calls[0][1] as string;
    expect(written).toContain('# ThreadKit');
  });
});
