import * as fs from 'fs';
import * as path from 'path';

export async function updateEnvFile(
  projectId: string,
  hostingType: 'hosted' | 'self-hosted'
): Promise<void> {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env.local');

  let content = '';

  // Read existing .env.local if it exists
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = content.split('\n');
  const newLines: string[] = [];
  const keysToAdd = new Map<string, string>();

  // Determine which keys to add
  keysToAdd.set('NEXT_PUBLIC_THREADKIT_PROJECT_ID', projectId);

  if (hostingType === 'self-hosted') {
    keysToAdd.set('NEXT_PUBLIC_THREADKIT_API_URL', 'http://localhost:8080/v1');
    keysToAdd.set('NEXT_PUBLIC_THREADKIT_WS_URL', 'ws://localhost:8081');
  }

  // Process existing lines, updating keys if they exist
  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line sets one of our keys
    let found = false;
    for (const [key] of keysToAdd) {
      if (trimmed.startsWith(`${key}=`)) {
        // Replace the existing value
        newLines.push(`${key}=${keysToAdd.get(key)}`);
        keysToAdd.delete(key);
        found = true;
        break;
      }
    }

    if (!found) {
      newLines.push(line);
    }
  }

  // Add any remaining keys that weren't found
  if (keysToAdd.size > 0) {
    // Add a blank line if the file doesn't end with one
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }

    // Add ThreadKit section header if adding new keys
    newLines.push('# ThreadKit');
    for (const [key, value] of keysToAdd) {
      newLines.push(`${key}=${value}`);
    }
  }

  // Write the file
  fs.writeFileSync(envPath, newLines.join('\n'));
}
