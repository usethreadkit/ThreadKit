import * as fs from 'fs';
import * as path from 'path';
import { type Framework } from '../detect-framework.js';
import { nextjsAppTemplate } from './nextjs-app.js';
import { nextjsPagesTemplate } from './nextjs-pages.js';
import { sveltekitTemplate } from './sveltekit.js';
import { viteReactTemplate } from './vite-react.js';

export interface TemplateOptions {
  projectId: string;
  plugins: string[];
}

export async function createExamplePage(
  framework: Framework,
  projectId: string,
  plugins: string[]
): Promise<string> {
  const cwd = process.cwd();
  const options: TemplateOptions = { projectId, plugins };

  let relativePath: string;
  let content: string;

  switch (framework.type) {
    case 'nextjs-app': {
      // Check if using src directory
      const useSrc = fs.existsSync(path.join(cwd, 'src', 'app'));
      const baseDir = useSrc ? 'src/app' : 'app';
      relativePath = `${baseDir}/threadkit-demo/page.tsx`;
      content = nextjsAppTemplate(options);
      break;
    }

    case 'nextjs-pages': {
      // Check if using src directory
      const useSrc = fs.existsSync(path.join(cwd, 'src', 'pages'));
      const baseDir = useSrc ? 'src/pages' : 'pages';
      relativePath = `${baseDir}/threadkit-demo.tsx`;
      content = nextjsPagesTemplate(options);
      break;
    }

    case 'sveltekit': {
      relativePath = 'src/routes/threadkit-demo/+page.svelte';
      content = sveltekitTemplate(options);
      break;
    }

    case 'svelte':
    case 'vite-react':
    case 'remix':
    case 'astro':
    case 'gatsby':
    default: {
      relativePath = 'src/ThreadKitDemo.tsx';
      content = viteReactTemplate(options);
      break;
    }
  }

  const fullPath = path.join(cwd, relativePath);

  // Create directory if it doesn't exist
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(fullPath, content);

  return relativePath;
}
