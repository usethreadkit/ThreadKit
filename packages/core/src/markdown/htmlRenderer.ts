// ============================================================================
// HTML Renderer for Markdown Tokens
// Used by vanilla JS implementations
// ============================================================================

import { tokenizeLine, parseBlocks, isSafeUrl, type Token, type TokenizerOptions, type Block } from './tokenizer';
import { escapeHtml } from '../utils/format';

export interface RenderOptions extends TokenizerOptions {
  /** CSS class prefix for all elements */
  classPrefix?: string;
}

/**
 * Render tokens to HTML string
 */
function renderTokens(tokens: Token[], options: RenderOptions): string {
  const prefix = options.classPrefix || 'threadkit';

  return tokens.map((token) => {
    switch (token.type) {
      case 'bold':
        return `<strong>${renderTokens(tokenizeLine(token.content, options), options)}</strong>`;
      case 'italic':
        return `<em>${renderTokens(tokenizeLine(token.content, options), options)}</em>`;
      case 'strike':
        return `<del>${renderTokens(tokenizeLine(token.content, options), options)}</del>`;
      case 'code':
        return `<code class="${prefix}-inline-code">${escapeHtml(token.content)}</code>`;
      case 'link': {
        if (!token.url || !isSafeUrl(token.url)) {
          return `<span class="${prefix}-unsafe-link">${escapeHtml(token.content)}</span>`;
        }
        return `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer" class="${prefix}-link">${escapeHtml(token.content)}</a>`;
      }
      case 'mention':
        return `<span class="${prefix}-mention" data-user-id="${escapeHtml(token.userId || token.content)}">@${escapeHtml(token.content)}</span>`;
      default:
        return escapeHtml(token.content);
    }
  }).join('');
}

/**
 * Render block to HTML string
 */
function renderBlock(block: Block, options: RenderOptions): string {
  const prefix = options.classPrefix || 'threadkit';

  switch (block.type) {
    case 'heading': {
      const level = block.level || 1;
      const content = renderTokens(tokenizeLine(block.lines[0], options), options);
      return `<h${level} class="${prefix}-heading ${prefix}-h${level}">${content}</h${level}>`;
    }
    case 'quote': {
      const content = block.lines.map((line, i) =>
        renderTokens(tokenizeLine(line, options), options) + (i < block.lines.length - 1 ? '<br>' : '')
      ).join('');
      return `<blockquote class="${prefix}-blockquote">${content}</blockquote>`;
    }
    case 'list': {
      const items = block.lines.map((item) =>
        `<li>${renderTokens(tokenizeLine(item, options), options)}</li>`
      ).join('');
      return `<ul class="${prefix}-list">${items}</ul>`;
    }
    case 'paragraph':
    default: {
      const content = block.lines.map((line, i) =>
        renderTokens(tokenizeLine(line, options), options) + (i < block.lines.length - 1 ? '<br>' : '')
      ).join('');
      return `<p class="${prefix}-paragraph">${content}</p>`;
    }
  }
}

/**
 * Render markdown text to HTML string.
 * This is a framework-agnostic renderer for vanilla JS usage.
 */
export function renderMarkdownToHtml(text: string, options: RenderOptions = {}): string {
  const blocks = parseBlocks(text);
  return blocks.map(block => renderBlock(block, options)).join('');
}

/**
 * Render a single line of markdown to HTML (no block-level parsing).
 * Useful for inline content like chat messages.
 */
export function renderMarkdownLineToHtml(text: string, options: RenderOptions = {}): string {
  const tokens = tokenizeLine(text, options);
  return renderTokens(tokens, options);
}
