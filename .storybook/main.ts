import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@threadkit/core': resolve(__dirname, '../packages/core/src'),
          '@threadkit/react': resolve(__dirname, '../packages/react/src'),
          '@threadkit/plugin-auth-ethereum': resolve(__dirname, '../packages/plugin-auth-ethereum/src'),
          '@threadkit/plugin-auth-solana': resolve(__dirname, '../packages/plugin-auth-solana/src'),
        },
        dedupe: ['react', 'react-dom'],
      },
      esbuild: {
        jsx: 'automatic',
      },
    });
  },
};

export default config;
