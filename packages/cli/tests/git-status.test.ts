import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process.exec with promisify-compatible implementation
const mockExec = vi.fn();
vi.mock('child_process', () => ({
  exec: (cmd: string, opts: object, callback: Function) => {
    mockExec(cmd, opts, callback);
  },
}));

// Import after mock
import { checkGitStatus } from '../src/git-status.js';

describe('checkGitStatus', () => {
  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
    mockExec.mockReset();
  });

  it('returns clean status when no changes', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: object, callback: Function) => {
      callback(null, '', '');
    });

    const result = await checkGitStatus();
    expect(result).toEqual({
      clean: true,
      notARepo: false,
      changes: undefined,
    });
  });

  it('returns changes when files are modified', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: object, callback: Function) => {
      callback(null, 'M  src/index.ts\n?? new-file.ts\n', '');
    });

    const result = await checkGitStatus();
    expect(result).toEqual({
      clean: false,
      notARepo: false,
      changes: ['M  src/index.ts', '?? new-file.ts'],
    });
  });

  it('returns notARepo when git command fails', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: object, callback: Function) => {
      callback(new Error('not a git repository'), '', '');
    });

    const result = await checkGitStatus();
    expect(result).toEqual({
      clean: true,
      notARepo: true,
    });
  });

  it('calls git status --porcelain', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: object, callback: Function) => {
      callback(null, '', '');
    });

    await checkGitStatus();

    expect(mockExec).toHaveBeenCalledWith(
      'git status --porcelain',
      expect.objectContaining({ cwd: '/test/project' }),
      expect.any(Function)
    );
  });
});
