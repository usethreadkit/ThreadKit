import { describe, it, expect } from 'vitest';
import { createSyntaxHighlightPlugin, syntaxHighlightPlugin } from '../src/index';

describe('createSyntaxHighlightPlugin', () => {
  describe('plugin structure', () => {
    it('returns a plugin with correct name', () => {
      const plugin = createSyntaxHighlightPlugin();
      expect(plugin.name).toBe('syntax-highlight');
    });

    it('has findSegments function', () => {
      const plugin = createSyntaxHighlightPlugin();
      expect(typeof plugin.findSegments).toBe('function');
    });

    it('has styles', () => {
      const plugin = createSyntaxHighlightPlugin();
      expect(plugin.styles).toBeDefined();
      expect(plugin.styles).toContain('threadkit-code-block');
    });
  });

  describe('code block detection', () => {
    it('finds code blocks with language', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```javascript\nconst x = 1;\n```';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('code-block');
      expect(segments[0].instruction.props.language).toBe('javascript');
      expect(segments[0].instruction.props.code).toBe('const x = 1;');
    });

    it('finds code blocks without language', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```\nsome code\n```';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.language).toBe('text');
      expect(segments[0].instruction.props.code).toBe('some code');
    });

    it('finds multiple code blocks', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```js\ncode1\n```\n\nSome text\n\n```python\ncode2\n```';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(2);
      expect(segments[0].instruction.props.language).toBe('js');
      expect(segments[1].instruction.props.language).toBe('python');
    });

    it('returns correct start and end positions', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = 'Before ```js\nx\n``` After';
      const segments = plugin.findSegments!(text);

      expect(segments[0].start).toBe(7);
      expect(text.slice(segments[0].start, segments[0].end)).toBe('```js\nx\n```');
    });

    it('trims code content', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```js\n  \n  const x = 1;  \n  \n```';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.code).toBe('const x = 1;');
    });
  });

  describe('theme option', () => {
    it('defaults to dark theme', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```js\ncode\n```';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.theme).toBe('dark');
    });

    it('accepts light theme option', () => {
      const plugin = createSyntaxHighlightPlugin({ theme: 'light' });
      const text = '```js\ncode\n```';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.theme).toBe('light');
    });

    it('accepts dark theme option', () => {
      const plugin = createSyntaxHighlightPlugin({ theme: 'dark' });
      const text = '```js\ncode\n```';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.theme).toBe('dark');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for text without code blocks', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = 'Just plain text without any code';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });

    it('handles empty string', () => {
      const plugin = createSyntaxHighlightPlugin();
      const segments = plugin.findSegments!('');

      expect(segments).toHaveLength(0);
    });

    it('handles multi-line code', () => {
      const plugin = createSyntaxHighlightPlugin();
      const text = '```js\nline1\nline2\nline3\n```';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.code).toBe('line1\nline2\nline3');
    });

    it('handles various language identifiers', () => {
      const plugin = createSyntaxHighlightPlugin();
      const languages = ['typescript', 'tsx', 'rust', 'go', 'cpp', 'sql'];

      for (const lang of languages) {
        const text = `\`\`\`${lang}\ncode\n\`\`\``;
        const segments = plugin.findSegments!(text);
        expect(segments[0].instruction.props.language).toBe(lang);
      }
    });
  });
});

describe('syntaxHighlightPlugin', () => {
  it('is a pre-configured plugin instance', () => {
    expect(syntaxHighlightPlugin.name).toBe('syntax-highlight');
    expect(typeof syntaxHighlightPlugin.findSegments).toBe('function');
  });

  it('uses default dark theme', () => {
    const text = '```js\ncode\n```';
    const segments = syntaxHighlightPlugin.findSegments!(text);

    expect(segments[0].instruction.props.theme).toBe('dark');
  });
});
