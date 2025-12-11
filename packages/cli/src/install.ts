import { exec } from 'child_process';
import { promisify } from 'util';
import { type PackageManager, getInstallCommand } from './detect-package-manager.js';

const execAsync = promisify(exec);

export async function installPackages(
  packages: string[],
  packageManager: PackageManager
): Promise<void> {
  if (packages.length === 0) return;

  const command = getInstallCommand(packageManager);
  const fullCommand = `${command} ${packages.join(' ')}`;

  await execAsync(fullCommand, {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' },
  });
}
