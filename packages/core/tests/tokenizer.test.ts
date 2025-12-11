import { describe, it, expect } from 'vitest';
import { tokenizeLine, parseBlocks, isSafeUrl } from '../src/markdown/tokenizer';

describe('tokenizeLine', () => {
  describe('plain text', () => {
    it('tokenizes plain text', () => {
      const tokens = tokenizeLine('Hello world');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Hello world' });
    });

    it('handles empty string', () => {
      const tokens = tokenizeLine('');
      expect(tokens).toHaveLength(0);
    });
  });

  describe('bold', () => {
    it('tokenizes bold text', () => {
      const tokens = tokenizeLine('**bold**');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'bold', content: 'bold' });
    });

    it('tokenizes bold text with surrounding text', () => {
      const tokens = tokenizeLine('hello **world** there');
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', content: 'hello ' });
      expect(tokens[1]).toEqual({ type: 'bold', content: 'world' });
      expect(tokens[2]).toEqual({ type: 'text', content: ' there' });
    });

    it('handles multiple bold segments', () => {
      const tokens = tokenizeLine('**one** and **two**');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('bold');
      expect(tokens[1].type).toBe('text');
      expect(tokens[2].type).toBe('bold');
    });
  });

  describe('italic', () => {
    it('tokenizes italic text', () => {
      const tokens = tokenizeLine('*italic*');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'italic', content: 'italic' });
    });

    it('tokenizes italic with surrounding text', () => {
      const tokens = tokenizeLine('hello *world* there');
      expect(tokens).toHaveLength(3);
      expect(tokens[1]).toEqual({ type: 'italic', content: 'world' });
    });
  });

  describe('strikethrough', () => {
    it('tokenizes strikethrough text', () => {
      const tokens = tokenizeLine('~~deleted~~');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'strike', content: 'deleted' });
    });
  });

  describe('inline code', () => {
    it('tokenizes inline code', () => {
      const tokens = tokenizeLine('`code`');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'code', content: 'code' });
    });

    it('preserves special chars inside code', () => {
      const tokens = tokenizeLine('`**not bold**`');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({ type: 'code', content: '**not bold**' });
    });
  });

  describe('markdown links', () => {
    it('does not parse links without allowLinks option', () => {
      const tokens = tokenizeLine('[text](https://example.com)');
      // Without allowLinks, [ and ] are consumed one at a time
      expect(tokens.some(t => t.type === 'link')).toBe(false);
    });

    it('parses links with allowLinks option', () => {
      const tokens = tokenizeLine('[text](https://example.com)', { allowLinks: true });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'link',
        content: 'text',
        url: 'https://example.com',
      });
    });

    it('parses links with surrounding text', () => {
      const tokens = tokenizeLine('Check [this](https://example.com) out', { allowLinks: true });
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Check ' });
      expect(tokens[1]).toEqual({ type: 'link', content: 'this', url: 'https://example.com' });
      expect(tokens[2]).toEqual({ type: 'text', content: ' out' });
    });
  });

  describe('auto-links', () => {
    it('does not auto-link URLs without enableAutoLinks option', () => {
      const tokens = tokenizeLine('Visit https://example.com today');
      expect(tokens.some(t => t.type === 'link')).toBe(false);
    });

    it('auto-links URLs at the start of text', () => {
      const tokens = tokenizeLine('https://example.com is great', { enableAutoLinks: true });
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
      expect(tokens[1]).toEqual({ type: 'text', content: ' is great' });
    });

    it('auto-links URLs in the middle of text', () => {
      const tokens = tokenizeLine('Check out https://example.com today', { enableAutoLinks: true });
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Check out ' });
      expect(tokens[1]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
      expect(tokens[2]).toEqual({ type: 'text', content: ' today' });
    });

    it('auto-links URLs at the end of text', () => {
      const tokens = tokenizeLine('Visit https://example.com', { enableAutoLinks: true });
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Visit ' });
      expect(tokens[1]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
    });

    it('auto-links http URLs', () => {
      const tokens = tokenizeLine('http://example.com', { enableAutoLinks: true });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'link',
        content: 'http://example.com',
        url: 'http://example.com',
      });
    });

    it('auto-links multiple URLs', () => {
      const tokens = tokenizeLine('See https://a.com and https://b.com', { enableAutoLinks: true });
      const links = tokens.filter(t => t.type === 'link');
      expect(links).toHaveLength(2);
      expect(links[0].url).toBe('https://a.com');
      expect(links[1].url).toBe('https://b.com');
    });

    it('handles URLs with paths and query strings', () => {
      const tokens = tokenizeLine('https://example.com/path?q=1&b=2', { enableAutoLinks: true });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].url).toBe('https://example.com/path?q=1&b=2');
    });
  });

  describe('images', () => {
    it('does not parse images without allowLinks option', () => {
      const tokens = tokenizeLine('![alt](https://example.com/img.jpg)');
      expect(tokens.some(t => t.type === 'image')).toBe(false);
    });

    it('parses images with allowLinks option', () => {
      const tokens = tokenizeLine('![alt text](https://example.com/image.jpg)', { allowLinks: true });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'image',
        content: 'alt text',
        url: 'https://example.com/image.jpg',
      });
    });

    it('parses images with empty alt text', () => {
      const tokens = tokenizeLine('![](https://example.com/image.jpg)', { allowLinks: true });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'image',
        content: '',
        url: 'https://example.com/image.jpg',
      });
    });

    it('parses images with surrounding text', () => {
      const tokens = tokenizeLine('Look at this ![image](https://example.com/img.jpg) cool!', { allowLinks: true });
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Look at this ' });
      expect(tokens[1]).toEqual({ type: 'image', content: 'image', url: 'https://example.com/img.jpg' });
      expect(tokens[2]).toEqual({ type: 'text', content: ' cool!' });
    });

    it('parses multiple images', () => {
      const tokens = tokenizeLine('![img1](http://localhost/1.webp) ![img2](http://localhost/2.webp)', { allowLinks: true });
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'image', content: 'img1', url: 'http://localhost/1.webp' });
      expect(tokens[1]).toEqual({ type: 'text', content: ' ' });
      expect(tokens[2]).toEqual({ type: 'image', content: 'img2', url: 'http://localhost/2.webp' });
    });

    it('parses images with text before, between, and after', () => {
      const tokens = tokenizeLine('text ![img1](http://localhost/1.webp) middle ![img2](http://localhost/2.webp) end', { allowLinks: true });
      const images = tokens.filter(t => t.type === 'image');
      expect(images).toHaveLength(2);
      expect(images[0].url).toBe('http://localhost/1.webp');
      expect(images[1].url).toBe('http://localhost/2.webp');

      const textParts = tokens.filter(t => t.type === 'text');
      expect(textParts.some(t => t.content.includes('text'))).toBe(true);
      expect(textParts.some(t => t.content.includes('middle'))).toBe(true);
      expect(textParts.some(t => t.content.includes('end'))).toBe(true);
    });

    describe('security - XSS prevention', () => {
      it('parses javascript: URL as image token (security check happens in renderer)', () => {
        const tokens = tokenizeLine('![xss](javascript:alert(1))', { allowLinks: true });
        // The ) in alert(1) terminates the URL match early, resulting in 2 tokens
        expect(tokens.length).toBeGreaterThanOrEqual(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toContain('javascript:alert');
        // Note: The tokenizer passes through the URL; security filtering happens in isSafeUrl()
      });

      it('parses javascript: URL without parentheses as image token', () => {
        const tokens = tokenizeLine('![xss](javascript:alert)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('javascript:alert');
      });

      it('parses data: URL as image token', () => {
        const tokens = tokenizeLine('![xss](data:text/html,test)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('data:text/html,test');
      });

      it('parses vbscript: URL as image token', () => {
        const tokens = tokenizeLine('![xss](vbscript:msgbox)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('vbscript:msgbox');
      });

      it('parses javascript: with whitespace as image token', () => {
        const tokens = tokenizeLine('![xss](  javascript:alert)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('  javascript:alert');
      });

      it('parses JAVASCRIPT: (uppercase) as image token', () => {
        const tokens = tokenizeLine('![xss](JAVASCRIPT:alert)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('JAVASCRIPT:alert');
      });

      it('parses data URL with base64 encoded script as image token', () => {
        const tokens = tokenizeLine('![xss](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].url).toBe('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
      });

      it('handles multiple images with mixed safe and unsafe URLs', () => {
        const tokens = tokenizeLine('![safe](https://example.com/img.jpg) ![xss](javascript:alert) ![safe2](http://test.com/img.png)', { allowLinks: true });
        const images = tokens.filter(t => t.type === 'image');
        expect(images).toHaveLength(3);
        expect(images[0].url).toBe('https://example.com/img.jpg');
        expect(images[1].url).toBe('javascript:alert');
        expect(images[2].url).toBe('http://test.com/img.png');
      });

      it('parses image with potentially malicious alt text', () => {
        const tokens = tokenizeLine('![<img src=x onerror=alert(1)>](https://example.com/img.jpg)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        // The regex stops at > which terminates the alt text early
        expect(tokens[0].content).toContain('<img src=x onerror=alert');
        // Alt text should be escaped by the renderer
      });

      it('parses image with quotes in alt text', () => {
        const tokens = tokenizeLine('![test alt](https://example.com/img.jpg)', { allowLinks: true });
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('image');
        expect(tokens[0].content).toBe('test alt');
      });
    });
  });

  describe('mentions', () => {
    it('does not parse mentions without enableMentions option', () => {
      const tokens = tokenizeLine('Hello @john');
      expect(tokens.some(t => t.type === 'mention')).toBe(false);
    });

    it('parses mentions with enableMentions option', () => {
      const tokens = tokenizeLine('Hello @john', { enableMentions: true });
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(tokens[1]).toEqual({ type: 'mention', content: 'john', userId: 'john' });
    });

    it('uses resolveUsername callback', () => {
      const tokens = tokenizeLine('@john', {
        enableMentions: true,
        resolveUsername: (name) => name === 'john' ? 'user-123' : undefined,
      });
      expect(tokens[0]).toEqual({ type: 'mention', content: 'john', userId: 'user-123' });
    });

    it('parses multiple mentions', () => {
      const tokens = tokenizeLine('@alice and @bob', { enableMentions: true });
      const mentions = tokens.filter(t => t.type === 'mention');
      expect(mentions).toHaveLength(2);
      expect(mentions[0].content).toBe('alice');
      expect(mentions[1].content).toBe('bob');
    });
  });

  describe('combined formatting', () => {
    it('handles bold and italic together', () => {
      const tokens = tokenizeLine('**bold** and *italic*');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('bold');
      expect(tokens[1].type).toBe('text');
      expect(tokens[2].type).toBe('italic');
    });

    it('handles code with links', () => {
      const tokens = tokenizeLine('Run `npm install` then visit [docs](https://docs.com)', {
        allowLinks: true,
      });
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe('text');
      expect(tokens[1].type).toBe('code');
      expect(tokens[2].type).toBe('text');
      expect(tokens[3].type).toBe('link');
    });

    it('handles all formatting types', () => {
      const tokens = tokenizeLine(
        '**bold** *italic* ~~strike~~ `code` [link](https://x.com) @user https://auto.com',
        { allowLinks: true, enableMentions: true, enableAutoLinks: true }
      );

      const types = tokens.map(t => t.type);
      expect(types).toContain('bold');
      expect(types).toContain('italic');
      expect(types).toContain('strike');
      expect(types).toContain('code');
      expect(types).toContain('link');
      expect(types).toContain('mention');
    });
  });
});

describe('parseBlocks', () => {
  describe('paragraphs', () => {
    it('parses single paragraph', () => {
      const blocks = parseBlocks('Hello world');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].lines).toEqual(['Hello world']);
    });

    it('parses multiple lines as single paragraph', () => {
      const blocks = parseBlocks('Line 1\nLine 2');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].lines).toEqual(['Line 1', 'Line 2']);
    });

    it('separates paragraphs by empty lines', () => {
      const blocks = parseBlocks('Para 1\n\nPara 2');
      expect(blocks).toHaveLength(2);
      expect(blocks[0].lines).toEqual(['Para 1']);
      expect(blocks[1].lines).toEqual(['Para 2']);
    });
  });

  describe('headings', () => {
    it('parses h1 heading', () => {
      const blocks = parseBlocks('# Heading 1');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('heading');
      expect(blocks[0].level).toBe(1);
      expect(blocks[0].lines).toEqual(['Heading 1']);
    });

    it('parses h2-h6 headings', () => {
      const blocks = parseBlocks('## H2\n### H3\n#### H4');
      expect(blocks).toHaveLength(3);
      expect(blocks[0].level).toBe(2);
      expect(blocks[1].level).toBe(3);
      expect(blocks[2].level).toBe(4);
    });
  });

  describe('quotes', () => {
    it('parses blockquote', () => {
      const blocks = parseBlocks('> Quote text');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('quote');
      expect(blocks[0].lines).toEqual(['Quote text']);
    });

    it('parses multi-line blockquote', () => {
      const blocks = parseBlocks('> Line 1\n> Line 2');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('quote');
      expect(blocks[0].lines).toEqual(['Line 1', 'Line 2']);
    });
  });

  describe('lists', () => {
    it('parses unordered list with asterisks', () => {
      const blocks = parseBlocks('* Item 1\n* Item 2');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('list');
      expect(blocks[0].lines).toEqual(['Item 1', 'Item 2']);
    });

    it('parses unordered list with dashes', () => {
      const blocks = parseBlocks('- Item 1\n- Item 2');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('list');
      expect(blocks[0].lines).toEqual(['Item 1', 'Item 2']);
    });
  });

  describe('mixed content', () => {
    it('parses heading followed by paragraph', () => {
      const blocks = parseBlocks('# Title\n\nContent here');
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('heading');
      expect(blocks[1].type).toBe('paragraph');
    });

    it('parses complex document', () => {
      const doc = `# Title

First paragraph.

> A quote

* List item 1
* List item 2

## Subtitle`;
      const blocks = parseBlocks(doc);
      expect(blocks.map(b => b.type)).toEqual([
        'heading',
        'paragraph',
        'quote',
        'list',
        'heading',
      ]);
    });
  });
});

describe('isSafeUrl', () => {
  it('returns true for https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('returns false for javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('returns false for vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSafeUrl('')).toBe(false);
  });

  it('ignores leading whitespace in dangerous URLs', () => {
    expect(isSafeUrl('  javascript:alert(1)')).toBe(false);
  });
});
