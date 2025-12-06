import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from '../shared/plugin';

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
});
