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
          '@threadkit/plugin-auth-ethereum': '/packages/plugin-auth-ethereum/src',
          '@threadkit/plugin-auth-solana': '/packages/plugin-auth-solana/src',
          // Force single React version to avoid "React Element from older version" error
          'react': '/node_modules/.pnpm/react@19.2.0/node_modules/react',
          'react-dom': '/node_modules/.pnpm/react-dom@19.2.0_react@19.2.0/node_modules/react-dom',
          'react/jsx-runtime': '/node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime',
        },
      },
      esbuild: {
        jsx: 'automatic',
      },
    });
  },
};

export default config;
