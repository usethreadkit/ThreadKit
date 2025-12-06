import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mockApiPlugin } from '../shared/plugin';

export default defineConfig({
  plugins: [svelte(), mockApiPlugin()],
});
