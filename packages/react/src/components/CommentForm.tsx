import React, { useState, useCallback } from 'react';
import type { CommentFormProps } from '../types';
import { useTranslation } from '../i18n';
import { NewCommentsBanner } from './NewCommentsBanner';

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
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
  pendingCount,
  onLoadPending,
}: CommentFormProps) {
  const t = useTranslation();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const placeholderText = placeholder ?? t('writeComment');

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
        setError(err instanceof Error ? err.message : t('failedToPost'));
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
        placeholder={placeholderText}
        disabled={isSubmitting}
        rows={3}
        autoFocus={autoFocus}
      />

      {error && <div className="threadkit-error">{error}</div>}

      <div className="threadkit-form-actions">
        <button
          type="submit"
          className="threadkit-submit-btn"
          disabled={isSubmitting || !text.trim()}
        >
          {isSubmitting ? t('posting') : t('post')}
        </button>
        {onCancel && (
          <button
            type="button"
            className="threadkit-cancel-btn"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </button>
        )}
        <div className="threadkit-form-actions-spacer" />
        {pendingCount !== undefined && pendingCount > 0 && onLoadPending && (
          <NewCommentsBanner count={pendingCount} onClick={onLoadPending} />
        )}
        <button
          type="button"
          className="threadkit-formatting-help-toggle"
          onClick={() => setShowHelp(!showHelp)}
        >
          {t('formattingHelp')}
        </button>
      </div>

      {showHelp && (
        <div className="threadkit-formatting-help">
          <div className="threadkit-formatting-help-header">
            {t('markdownSupported')}
          </div>
          <table className="threadkit-formatting-help-table">
            <thead>
              <tr>
                <th>{t('youType')}</th>
                <th>{t('youSee')}</th>
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
