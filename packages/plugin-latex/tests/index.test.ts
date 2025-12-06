import { describe, it, expect } from 'vitest';
import { createLatexPlugin, latexPlugin } from '../src/index';

describe('createLatexPlugin', () => {
  describe('plugin structure', () => {
    it('returns a plugin with correct name', () => {
      const plugin = createLatexPlugin();
      expect(plugin.name).toBe('latex');
    });

    it('has findSegments function', () => {
      const plugin = createLatexPlugin();
      expect(typeof plugin.findSegments).toBe('function');
    });

    it('has styles', () => {
      const plugin = createLatexPlugin();
      expect(plugin.styles).toBeDefined();
      expect(plugin.styles).toContain('katex');
    });
  });

  describe('inline math detection', () => {
    it('finds inline math with $...$', () => {
      const plugin = createLatexPlugin();
      const text = 'The formula $E = mc^2$ is famous';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('latex');
      expect(segments[0].instruction.props.expression).toBe('E = mc^2');
      expect(segments[0].instruction.props.displayMode).toBe(false);
    });

    it('finds multiple inline math expressions', () => {
      const plugin = createLatexPlugin();
      const text = 'Given $x = 1$ and $y = 2$, find $x + y$';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(3);
      expect(segments[0].instruction.props.expression).toBe('x = 1');
      expect(segments[1].instruction.props.expression).toBe('y = 2');
      expect(segments[2].instruction.props.expression).toBe('x + y');
    });

    it('returns correct start and end positions', () => {
      const plugin = createLatexPlugin();
      const text = 'Here is $x^2$ in text';
      const segments = plugin.findSegments!(text);

      expect(segments[0].start).toBe(8); // Position of first $
      expect(segments[0].end).toBe(13); // Position after second $
      expect(text.slice(segments[0].start, segments[0].end)).toBe('$x^2$');
    });

    it('can be disabled via options', () => {
      const plugin = createLatexPlugin({ inlineMath: false });
      const text = 'The formula $E = mc^2$ is famous';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('display math detection', () => {
    it('finds display math with $$...$$', () => {
      const plugin = createLatexPlugin();
      const text = 'The equation:\n$$\\int_0^1 x^2 dx$$\nis important';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('latex');
      expect(segments[0].instruction.props.expression).toBe('\\int_0^1 x^2 dx');
      expect(segments[0].instruction.props.displayMode).toBe(true);
    });

    it('can be disabled via options', () => {
      const plugin = createLatexPlugin({ displayMath: false, inlineMath: false });
      const text = 'Equation: $$x^2 + y^2 = z^2$$';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });

    it('when disabled, inline math still works independently', () => {
      const plugin = createLatexPlugin({ displayMath: false });
      const text = 'Here is $x^2$ inline';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.displayMode).toBe(false);
      expect(segments[0].instruction.props.expression).toBe('x^2');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for text without math', () => {
      const plugin = createLatexPlugin();
      const text = 'Just plain text without any math';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });

    it('handles empty string', () => {
      const plugin = createLatexPlugin();
      const segments = plugin.findSegments!('');

      expect(segments).toHaveLength(0);
    });

    it('trims whitespace from expressions', () => {
      const plugin = createLatexPlugin();
      const text = '$  x + y  $';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.expression).toBe('x + y');
    });

    it('does not match inline math inside display math', () => {
      const plugin = createLatexPlugin();
      const text = '$$x + y$$';
      const segments = plugin.findSegments!(text);

      // Should only find the display math
      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.displayMode).toBe(true);
      expect(segments[0].instruction.props.expression).toBe('x + y');
    });

    it('avoids inline math overlapping with display math', () => {
      const plugin = createLatexPlugin();
      const text = 'Before $$a + b$$ after';
      const segments = plugin.findSegments!(text);

      // Display math prevents inline from matching inside it
      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.displayMode).toBe(true);
      expect(segments[0].instruction.props.expression).toBe('a + b');
    });

    it('handles consecutive math expressions', () => {
      const plugin = createLatexPlugin();
      const text = '$a$$b$';
      const segments = plugin.findSegments!(text);

      expect(segments.length).toBeGreaterThan(0);
    });
  });

  describe('options', () => {
    it('uses default options when none provided', () => {
      const plugin = createLatexPlugin();
      const text = '$inline$ and $$display$$';
      const segments = plugin.findSegments!(text);

      expect(segments.length).toBe(2);
    });

    it('can disable both math types', () => {
      const plugin = createLatexPlugin({ inlineMath: false, displayMath: false });
      const text = '$inline$ and $$display$$';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });
});

describe('latexPlugin', () => {
  it('is a pre-configured plugin instance', () => {
    expect(latexPlugin.name).toBe('latex');
    expect(typeof latexPlugin.findSegments).toBe('function');
  });

  it('uses default options', () => {
    const text = '$inline$ and $$display$$';
    const segments = latexPlugin.findSegments!(text);

    expect(segments.length).toBe(2);
  });
});
