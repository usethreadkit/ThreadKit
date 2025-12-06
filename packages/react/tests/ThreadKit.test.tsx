import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadKit } from '../src/ThreadKit';

// Mock fetch to return the new API response format
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      tree: {
        comments: [],
        total_count: 0,
        page: 0,
        page_size: 50
      }
    }),
  })
) as unknown as typeof fetch;

// Mock WebSocket
vi.stubGlobal('WebSocket', class {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close() {}
  send() {}
});

describe('ThreadKit', () => {
  it('renders loading state initially', () => {
    render(<ThreadKit apiKey="test-api-key" url="/test" />);
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
  });

  it('renders with comments mode by default', async () => {
    render(<ThreadKit apiKey="test-api-key" url="/test" />);
    // Should show the threadkit root
    expect(document.querySelector('.threadkit-root')).toBeInTheDocument();
  });

  it('applies dark theme when specified', () => {
    render(<ThreadKit apiKey="test-api-key" url="/test" theme="dark" />);
    const root = document.querySelector('.threadkit-root');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('shows branding by default', async () => {
    const { container } = render(<ThreadKit apiKey="test-api-key" url="/test" />);
    // Wait for loading to complete
    await vi.waitFor(() => {
      expect(container.querySelector('.threadkit-branding')).toBeInTheDocument();
    });
  });

  it('hides branding when hideBranding is true', async () => {
    const { container } = render(<ThreadKit apiKey="test-api-key" url="/test" hideBranding />);
    await vi.waitFor(() => {
      expect(container.querySelector('.threadkit-branding')).not.toBeInTheDocument();
    });
  });
});
