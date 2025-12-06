import type { ThreadKitPlugin, PluginSegment } from '@threadkit/core';

// Match $...$ for inline and $$...$$ for display mode
const INLINE_MATH_REGEX = /\$([^$\n]+)\$/g;
const DISPLAY_MATH_REGEX = /\$\$([^$]+)\$\$/g;

export interface LatexPluginOptions {
  /** Enable display math ($$...$$) - default true */
  displayMath?: boolean;
  /** Enable inline math ($...$) - default true */
  inlineMath?: boolean;
}

/**
 * Props passed to the LaTeX renderer component
 */
export interface LatexRenderProps {
  /** LaTeX expression to render */
  expression: string;
  /** Whether to render in display mode (block) vs inline mode */
  displayMode: boolean;
}

export function createLatexPlugin(options: LatexPluginOptions = {}): ThreadKitPlugin {
  const { displayMath = true, inlineMath = true } = options;

  return {
    name: 'latex',
    findSegments: (text: string): PluginSegment[] => {
      const segments: PluginSegment[] = [];

      // Reset regex state
      DISPLAY_MATH_REGEX.lastIndex = 0;
      INLINE_MATH_REGEX.lastIndex = 0;

      // Find display math ($$...$$) - higher priority
      if (displayMath) {
        let match;
        while ((match = DISPLAY_MATH_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'latex',
              props: {
                expression: match[1].trim(),
                displayMode: true,
              } satisfies LatexRenderProps,
            },
          });
        }
      }

      // Find inline math ($...$)
      if (inlineMath) {
        INLINE_MATH_REGEX.lastIndex = 0;
        let match;
        while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
          // Skip if this overlaps with a display math segment
          const start = match.index;
          const end = match.index + match[0].length;
          const overlapsDisplay = segments.some(
            (seg) => start < seg.end && end > seg.start
          );
          if (!overlapsDisplay) {
            segments.push({
              start,
              end,
              instruction: {
                type: 'latex',
                props: {
                  expression: match[1].trim(),
                  displayMode: false,
                } satisfies LatexRenderProps,
              },
            });
          }
        }
      }

      return segments;
    },
    styles: `
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');

      .threadkit-math-display {
        display: block;
        text-align: center;
        margin: 12px 0;
        overflow-x: auto;
      }
      .threadkit-math-inline {
        display: inline;
      }
      .threadkit-math-error {
        color: #cc0000;
        font-family: monospace;
        cursor: help;
      }
    `,
  };
}

// Default export for convenience
export const latexPlugin = createLatexPlugin();
