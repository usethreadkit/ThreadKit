import React, { useState, useCallback } from 'react';
import type { CommentFormProps } from '../types';

const FORMATTING_HELP = [
  { input: '*italics*', output: 'italics', style: 'italic' },
  { input: '**bold**', output: 'bold', style: 'bold' },
  { input: '[link](https://example.com)', output: 'link', style: 'link' },
  { input: '~~strikethrough~~', output: 'strikethrough', style: 'strikethrough' },
  { input: '`inline code`', output: 'inline code', style: 'code' },
  { input: '> quoted text', output: 'quoted text', style: 'quote' },
];

export function CommentForm({
  parentId,
  placeholder = 'Write a comment...',
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedText = text.trim();
      if (!trimmedText) return;

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(trimmedText, parentId);
        setText('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to post comment');
      } finally {
        setIsSubmitting(false);
      }
    },
    [text, parentId, onSubmit]
  );

  return (
    <form className="threadkit-form" onSubmit={handleSubmit}>
      <textarea
        className="threadkit-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={3}
      />

      {error && <div className="threadkit-error">{error}</div>}

      <div className="threadkit-form-actions">
        <button
          type="submit"
          className="threadkit-submit-btn"
          disabled={isSubmitting || !text.trim()}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="threadkit-cancel-btn"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <div className="threadkit-form-actions-spacer" />
        <button
          type="button"
          className="threadkit-formatting-help-toggle"
          onClick={() => setShowHelp(!showHelp)}
        >
          formatting help
        </button>
      </div>

      {showHelp && (
        <div className="threadkit-formatting-help">
          <div className="threadkit-formatting-help-header">
            Markdown formatting is supported
          </div>
          <table className="threadkit-formatting-help-table">
            <thead>
              <tr>
                <th>you type:</th>
                <th>you see:</th>
              </tr>
            </thead>
            <tbody>
              {FORMATTING_HELP.map((item) => (
                <tr key={item.input}>
                  <td><code>{item.input}</code></td>
                  <td>
                    <span className={`threadkit-format-${item.style}`}>
                      {item.output}
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <code>* item 1</code><br />
                  <code>* item 2</code><br />
                  <code>* item 3</code>
                </td>
                <td>
                  <ul className="threadkit-format-list">
                    <li>item 1</li>
                    <li>item 2</li>
                    <li>item 3</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
