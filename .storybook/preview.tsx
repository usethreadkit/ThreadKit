import type { Preview } from '@storybook/react-vite';
import '../packages/core/src/styles/threadkit.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      options: {
        light: { name: 'light', value: '#ffffff' },
        dark: { name: 'dark', value: '#0a0a0a' }
      }
    },
  },

  decorators: [
    (Story) => (
      <div className="threadkit-root">
        <Story />
      </div>
    ),
  ],

  initialGlobals: {
    backgrounds: {
      value: 'light'
    }
  }
};

export default preview;
