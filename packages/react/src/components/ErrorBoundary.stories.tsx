import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorBoundary } from './ErrorBoundary';
import { useState } from 'react';

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error from the component!');
  }
  return <div>Component is working fine</div>;
}

export const WithoutError: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>Child Component</h3>
        <p>This component is rendering normally without any errors.</p>
      </div>
    </ErrorBoundary>
  ),
};

export const WithError: Story = {
  render: () => (
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  ),
};

export const WithCustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
          <h3 style={{ color: '#c00' }}>⚠️ Something went wrong</h3>
          <p>The component encountered an error and could not be rendered.</p>
        </div>
      }
    >
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);

    return (
      <div>
        <button
          onClick={() => setShouldThrow(!shouldThrow)}
          style={{
            padding: '8px 16px',
            marginBottom: '16px',
            cursor: 'pointer',
            backgroundColor: shouldThrow ? '#fee' : '#efe',
            border: '1px solid ' + (shouldThrow ? '#fcc' : '#cfc'),
            borderRadius: '4px',
          }}
        >
          {shouldThrow ? '❌ Throwing Error' : '✅ Working Fine'}
        </button>

        <ErrorBoundary
          fallback={
            <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
              <h3 style={{ color: '#c00' }}>Error Caught!</h3>
              <p>The component threw an error. Click the button above to reset.</p>
            </div>
          }
        >
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h3>Protected Component</h3>
            <p>Toggle the button above to simulate an error.</p>
            <ThrowError shouldThrow={shouldThrow} />
          </div>
        </ErrorBoundary>
      </div>
    );
  },
};

export const MultipleChildren: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
          <h3 style={{ color: '#c00' }}>Error in component tree</h3>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          Component 1: Working
        </div>
        <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          Component 2: Working
        </div>
        <ThrowError shouldThrow={true} />
      </div>
    </ErrorBoundary>
  ),
};
