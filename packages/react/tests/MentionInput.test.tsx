import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MentionInput, type MentionSuggestion } from '../src/components/MentionInput';

const mockSuggestions: MentionSuggestion[] = [
  { id: 'user-1', name: 'alice', avatar: 'https://example.com/alice.png' },
  { id: 'user-2', name: 'bob' },
  { id: 'user-3', name: 'charlie' },
];

describe('MentionInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic rendering', () => {
    it('renders textarea with placeholder', () => {
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          placeholder="Write something..."
        />
      );
      expect(screen.getByPlaceholderText('Write something...')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      render(
        <MentionInput
          value="Hello world"
          onChange={vi.fn()}
        />
      );
      expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          className="custom-class"
        />
      );
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('respects disabled prop', () => {
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          disabled
        />
      );
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('respects rows prop', () => {
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          rows={6}
        />
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
    });
  });

  describe('basic input', () => {
    it('calls onChange when typing', () => {
      const onChange = vi.fn();
      render(
        <MentionInput
          value=""
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      expect(onChange).toHaveBeenCalledWith('Hello');
    });

    it('calls onSubmit on Ctrl+Enter', () => {
      const onSubmit = vi.fn();
      render(
        <MentionInput
          value="Hello"
          onChange={vi.fn()}
          onSubmit={onSubmit}
        />
      );

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('mention suggestions', () => {
    it('shows suggestions when @ is typed', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@a', selectionStart: 2 },
        });
      });

      await waitFor(() => {
        expect(getMentionSuggestions).toHaveBeenCalledWith('a');
      });

      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('shows avatar in suggestions when available', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@', selectionStart: 1 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      const avatar = screen.getByAltText('');
      expect(avatar).toHaveAttribute('src', 'https://example.com/alice.png');
    });

    it('does not show suggestions when enableMentions is false', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions={false}
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@alice', selectionStart: 6 },
        });
      });

      expect(getMentionSuggestions).not.toHaveBeenCalled();
    });

    it('hides suggestions when @ is preceded by non-whitespace', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: 'hello@test', selectionStart: 10 },
        });
      });

      // Should not show suggestions for email-like patterns
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });

    it('limits suggestions to 5', async () => {
      const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        name: `user${i}`,
      }));
      const getMentionSuggestions = vi.fn().mockResolvedValue(manySuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@', selectionStart: 1 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('user0')).toBeInTheDocument();
      });

      // Should only show 5 suggestions
      expect(screen.queryByText('user5')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('navigates suggestions with arrow keys', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@', selectionStart: 1 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      // First item should be selected by default
      expect(screen.getByText('alice').closest('button')).toHaveClass('selected');

      // Press down arrow
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      });

      expect(screen.getByText('bob').closest('button')).toHaveClass('selected');

      // Press up arrow
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      });

      expect(screen.getByText('alice').closest('button')).toHaveClass('selected');
    });

    it('wraps around when navigating past end', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@', selectionStart: 1 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      // Navigate to last item
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      });

      expect(screen.getByText('charlie').closest('button')).toHaveClass('selected');

      // Go past end - should wrap to first
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      });

      expect(screen.getByText('alice').closest('button')).toHaveClass('selected');
    });

    it('closes suggestions on Escape', async () => {
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@', selectionStart: 1 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Escape' });
      });

      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });
  });

  describe('selecting mentions', () => {
    it('inserts mention on Enter key', async () => {
      const onChange = vi.fn();
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={onChange}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Set selection position before triggering change
      Object.defineProperty(textarea, 'selectionStart', { value: 1, writable: true });

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter' });
      });

      expect(onChange).toHaveBeenCalledWith('@alice ');
    });

    it('inserts mention on Tab key', async () => {
      const onChange = vi.fn();
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={onChange}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      Object.defineProperty(textarea, 'selectionStart', { value: 1, writable: true });

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Tab' });
      });

      expect(onChange).toHaveBeenCalledWith('@alice ');
    });

    it('inserts mention on click', async () => {
      const onChange = vi.fn();
      const getMentionSuggestions = vi.fn().mockResolvedValue(mockSuggestions);

      render(
        <MentionInput
          value=""
          onChange={onChange}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      Object.defineProperty(textarea, 'selectionStart', { value: 1, writable: true });

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });

      await waitFor(() => {
        expect(screen.getByText('bob')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('bob'));
      });

      expect(onChange).toHaveBeenCalledWith('@bob ');
    });

  });

  describe('error handling', () => {
    it('handles getMentionSuggestions error gracefully', async () => {
      const getMentionSuggestions = vi.fn().mockRejectedValue(new Error('API Error'));

      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          enableMentions
          getMentionSuggestions={getMentionSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');

      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: '@test', selectionStart: 5 },
        });
      });

      // Should not show suggestions and not throw
      await waitFor(() => {
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });
    });
  });
});
