import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mockApiPlugin } from './demo/mocks/plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  resolve: {
    alias: {
      '@threadkit/react': resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.THREADKIT_API_URL': JSON.stringify('/api'),
  },
});
