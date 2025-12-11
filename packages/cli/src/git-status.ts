import { exec } from 'child_process';

export interface GitStatus {
  clean: boolean;
  notARepo: boolean;
  changes?: string[];
}

function execAsync(command: string, options: { cwd: string }): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: stdout.toString() });
      }
    });
  });
}

export async function checkGitStatus(): Promise<GitStatus> {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: process.cwd(),
    });

    const changes = stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    return {
      clean: changes.length === 0,
      notARepo: false,
      changes: changes.length > 0 ? changes : undefined,
    };
  } catch {
    // Not a git repo or git not installed
    return {
      clean: true,
      notARepo: true,
    };
  }
}
