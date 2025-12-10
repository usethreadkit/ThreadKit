import type { Preview } from '@storybook/react';
import '../packages/core/src/styles/threadkit.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="threadkit-root">
        <Story />
      </div>
    ),
  ],
};

export default preview;
