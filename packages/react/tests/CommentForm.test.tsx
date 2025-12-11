import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentForm } from '../src/components/CommentForm';

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders textarea with placeholder', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
    });

    it('renders custom placeholder', () => {
      render(<CommentForm onSubmit={vi.fn()} placeholder="Write a reply..." />);
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      expect(screen.getByText('Post')).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      render(<CommentForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('renders formatting help button', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      expect(screen.getByText('Formatting help')).toBeInTheDocument();
    });
  });

  describe('submit button state', () => {
    it('disables submit button when textarea is empty', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      expect(screen.getByText('Post')).toBeDisabled();
    });

    it('disables submit button when textarea has only whitespace', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
      expect(screen.getByText('Post')).toBeDisabled();
    });

    it('enables submit button when textarea has content', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      expect(screen.getByText('Post')).not.toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with trimmed text', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Hello World  ' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('Hello World', undefined);
      });
    });

    it('calls onSubmit with parentId when provided', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CommentForm onSubmit={onSubmit} parentId="parent-123" />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reply' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('Reply', 'parent-123');
      });
    });

    it('clears textarea after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CommentForm onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('shows "Posting..." during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      expect(screen.getByText('Posting...')).toBeInTheDocument();
    });

    it('disables textarea during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CommentForm onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      expect(textarea).toBeDisabled();
    });

    it('does not submit when text is empty', async () => {
      const onSubmit = vi.fn();
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.submit(screen.getByRole('textbox').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('displays error message on submission failure', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays generic error for non-Error rejections', async () => {
      const onSubmit = vi.fn().mockRejectedValue('Something went wrong');
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(screen.getByText('Failed to post comment')).toBeInTheDocument();
      });
    });

    it('re-enables submit button after error', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Error'));
      render(<CommentForm onSubmit={onSubmit} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(screen.getByText('Post')).not.toBeDisabled();
      });
    });

    it('preserves text after error', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Error'));
      render(<CommentForm onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'My comment' } });
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(textarea).toHaveValue('My comment');
      });
    });
  });

  describe('cancel functionality', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<CommentForm onSubmit={vi.fn()} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('disables cancel button during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CommentForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByText('Post'));

      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('formatting help', () => {
    it('toggles formatting help visibility', () => {
      render(<CommentForm onSubmit={vi.fn()} />);

      // Initially hidden
      expect(screen.queryByText('Markdown formatting is supported')).not.toBeInTheDocument();

      // Show help
      fireEvent.click(screen.getByText('Formatting help'));
      expect(screen.getByText('Markdown formatting is supported')).toBeInTheDocument();

      // Hide help
      fireEvent.click(screen.getByText('Formatting help'));
      expect(screen.queryByText('Markdown formatting is supported')).not.toBeInTheDocument();
    });

    it('displays formatting examples', () => {
      render(<CommentForm onSubmit={vi.fn()} />);
      fireEvent.click(screen.getByText('Formatting help'));

      expect(screen.getByText('*italics*')).toBeInTheDocument();
      expect(screen.getByText('**bold**')).toBeInTheDocument();
      expect(screen.getByText('`inline code`')).toBeInTheDocument();
      expect(screen.getByText('~~strikethrough~~')).toBeInTheDocument();
    });
  });
});
