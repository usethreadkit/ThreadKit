import React, { useState, useCallback, useMemo } from 'react';
import type { CommentFormProps } from '../types';
import type { MediaUpload } from '@threadkit/core';
import { useTranslation } from '../i18n';
import { NewCommentsBanner } from './NewCommentsBanner';
import { MediaUploader } from './MediaUploader';

// Server enforces 10,000 character limit
const MAX_COMMENT_LENGTH = 10000;
// Show counter when within this many characters of the limit
const SHOW_COUNTER_THRESHOLD = 5000;

const FORMATTING_HELP = [
  { input: '*italics*', output: 'italics', style: 'italic' },
  { input: '**bold**', output: 'bold', style: 'bold' },
  { input: '[link](https://example.com)', output: 'link', style: 'link' },
  { input: '![alt](https://example.com/img.jpg)', output: 'image', style: 'link' },
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
  apiUrl,
  projectId,
  token,
}: CommentFormProps) {
  const t = useTranslation();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<MediaUpload[]>([]);

  const placeholderText = placeholder ?? t('writeComment');

  // Calculate character count and whether to show it
  const charCount = useMemo(() => text.length, [text]);
  const showCounter = charCount >= SHOW_COUNTER_THRESHOLD;
  const remaining = MAX_COMMENT_LENGTH - charCount;
  const isOverLimit = remaining < 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedText = text.trim();
      if (!trimmedText && attachedMedia.length === 0) return;

      setIsSubmitting(true);
      setError(null);

      try {
        // Text already contains markdown images from upload, just submit as-is
        await onSubmit(trimmedText, parentId);
        setText('');
        setAttachedMedia([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToPost'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [text, attachedMedia, parentId, onSubmit, t]
  );

  return (
    <form className="threadkit-form" onSubmit={handleSubmit}>
      <div className="threadkit-textarea-wrapper">
        <textarea
          className="threadkit-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholderText}
          disabled={isSubmitting}
          rows={3}
          autoFocus={autoFocus}
          maxLength={MAX_COMMENT_LENGTH}
        />
        {showCounter && (
          <div className={`threadkit-char-counter ${isOverLimit ? 'over-limit' : ''}`}>
            {remaining.toLocaleString()}
          </div>
        )}
      </div>

      {attachedMedia.length > 0 && (
        <div className="threadkit-attachments">
          {attachedMedia.map((media) => (
            <div key={media.mediaId} className="threadkit-attachment-preview">
              <img src={media.url} alt="Attached media preview" />
              <button
                type="button"
                className="threadkit-attachment-remove"
                aria-label="Remove attachment"
                onClick={() => {
                  // Remove from attachedMedia
                  setAttachedMedia(prev => prev.filter(m => m.mediaId !== media.mediaId));
                  // Remove markdown from textarea
                  const markdownToRemove = `![](${media.url})`;
                  setText(prev => {
                    // Remove the markdown link and clean up extra newlines
                    let updated = prev.replace(markdownToRemove, '');
                    // Clean up: remove multiple consecutive newlines
                    updated = updated.replace(/\n{3,}/g, '\n\n');
                    // Remove leading/trailing newlines
                    updated = updated.trim();
                    return updated;
                  });
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="threadkit-error" role="alert" aria-live="assertive">{error}</div>}

      <div className="threadkit-form-actions">
        <button
          type="submit"
          className="threadkit-submit-btn"
          disabled={isSubmitting || (!text.trim() && attachedMedia.length === 0)}
        >
          {isSubmitting ? t('posting') : t('post')}
        </button>
        {token && apiUrl && projectId && (
          <MediaUploader
            apiUrl={apiUrl}
            projectId={projectId}
            token={token}
            type="image"
            onUploadComplete={(media) => {
              setAttachedMedia(prev => [...prev, media]);
              // Append markdown image to textarea
              setText(prev => {
                const imageMarkdown = `![](${media.url})`;
                return prev ? `${prev}\n${imageMarkdown}` : imageMarkdown;
              });
            }}
            iconOnly
          />
        )}
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
