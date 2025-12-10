import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-themes',
  ],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@threadkit/core': '/packages/core/src',
          '@threadkit/react': '/packages/react/src',
        },
      },
      esbuild: {
        jsx: 'automatic',
      },
    });
  },
};

export default config;
