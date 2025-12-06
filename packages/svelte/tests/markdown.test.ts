import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/utils/markdown';

describe('renderMarkdown', () => {
  describe('basic text', () => {
    it('renders plain text in a paragraph', () => {
      const result = renderMarkdown('Hello world');
      expect(result).toContain('<p class="threadkit-paragraph">Hello world</p>');
    });

    it('escapes HTML entities', () => {
      const result = renderMarkdown('Hello <script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });
  });

  describe('inline formatting', () => {
    it('renders bold text', () => {
      const result = renderMarkdown('Hello **world**');
      expect(result).toContain('<strong>world</strong>');
    });

    it('renders italic text', () => {
      const result = renderMarkdown('Hello *world*');
      expect(result).toContain('<em>world</em>');
    });

    it('renders strikethrough text', () => {
      const result = renderMarkdown('Hello ~~world~~');
      expect(result).toContain('<del>world</del>');
    });

    it('renders inline code', () => {
      const result = renderMarkdown('Use `console.log()`');
      expect(result).toContain('<code class="threadkit-inline-code">console.log()</code>');
    });
  });

  describe('links', () => {
    it('renders markdown links', () => {
      const result = renderMarkdown('[Google](https://google.com)', { allowLinks: true });
      expect(result).toContain('<a href="https://google.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('renders auto-detected links at start of text', () => {
      const result = renderMarkdown('https://example.com is a good site', {
        allowLinks: true,
        enableAutoLinks: true,
      });
      expect(result).toContain('<a href="https://example.com"');
    });
  });

  describe('mentions', () => {
    it('renders mentions', () => {
      const result = renderMarkdown('Hello @john', { enableMentions: true });
      expect(result).toContain('<span class="threadkit-mention"');
      expect(result).toContain('@john');
    });
  });

  describe('block elements', () => {
    it('renders blockquotes', () => {
      const result = renderMarkdown('> This is a quote');
      expect(result).toContain('<blockquote class="threadkit-blockquote">');
      expect(result).toContain('This is a quote');
    });

    it('renders unordered lists', () => {
      const result = renderMarkdown('* Item 1\n* Item 2');
      expect(result).toContain('<ul class="threadkit-list">');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('renders lists with dashes', () => {
      const result = renderMarkdown('- Item 1\n- Item 2');
      expect(result).toContain('<ul class="threadkit-list">');
      expect(result).toContain('<li>Item 1</li>');
    });

    it('renders headings', () => {
      const result = renderMarkdown('# Heading 1');
      expect(result).toContain('<h1 class="threadkit-heading threadkit-h1">Heading 1</h1>');
    });

    it('renders different heading levels', () => {
      const result = renderMarkdown('## Heading 2');
      expect(result).toContain('<h2 class="threadkit-heading threadkit-h2">Heading 2</h2>');
    });
  });

  describe('paragraphs', () => {
    it('creates separate paragraphs for double newlines', () => {
      const result = renderMarkdown('Para 1\n\nPara 2');
      expect(result).toContain('<p class="threadkit-paragraph">Para 1</p>');
      expect(result).toContain('<p class="threadkit-paragraph">Para 2</p>');
    });

    it('creates line breaks for single newlines within paragraph', () => {
      const result = renderMarkdown('Line 1\nLine 2');
      expect(result).toContain('Line 1<br>Line 2');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = renderMarkdown('');
      expect(result).toBe('');
    });

    it('handles only whitespace', () => {
      const result = renderMarkdown('   \n   ');
      expect(result).toBe('');
    });

    it('handles complex nested formatting', () => {
      const result = renderMarkdown('**bold with *italic* inside**');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });
});
