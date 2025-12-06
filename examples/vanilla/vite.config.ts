import { defineConfig } from 'vite';
import { mockApiPlugin } from '../shared/plugin';

export default defineConfig({
  plugins: [mockApiPlugin()],
});
