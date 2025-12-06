import type { ThreadKitPlugin, PluginSegment } from '@threadkit/core';

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

export interface SyntaxHighlightPluginOptions {
  /** Theme for syntax highlighting - default 'dark' */
  theme?: 'light' | 'dark';
}

/**
 * Props passed to the code block renderer component
 */
export interface CodeBlockRenderProps {
  /** The code content */
  code: string;
  /** Programming language for syntax highlighting */
  language: string;
  /** Theme for syntax highlighting */
  theme: 'light' | 'dark';
}

export function createSyntaxHighlightPlugin(options: SyntaxHighlightPluginOptions = {}): ThreadKitPlugin {
  const { theme = 'dark' } = options;

  return {
    name: 'syntax-highlight',
    findSegments: (text: string): PluginSegment[] => {
      const segments: PluginSegment[] = [];
      const matches = [...text.matchAll(CODE_BLOCK_REGEX)];

      matches.forEach((match) => {
        const [fullMatch, lang = 'text', code] = match;
        const startIndex = match.index!;

        segments.push({
          start: startIndex,
          end: startIndex + fullMatch.length,
          instruction: {
            type: 'code-block',
            props: {
              code: code.trim(),
              language: lang,
              theme,
            } satisfies CodeBlockRenderProps,
          },
        });
      });

      return segments;
    },
    styles: `
      .threadkit-code-block {
        margin: 8px 0;
        border-radius: 6px;
        overflow-x: auto;
      }
      .threadkit-code-block pre {
        margin: 0;
        padding: 12px;
        font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
      .threadkit-code-block code {
        font-family: inherit;
      }
    `,
  };
}

// Default export for convenience
export const syntaxHighlightPlugin = createSyntaxHighlightPlugin();
