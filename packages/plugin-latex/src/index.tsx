import React from 'react';
import katex from 'katex';
import DOMPurify from 'dompurify';
import type { ThreadKitPlugin, PluginSegmentCallback } from '@threadkit/react';

// Match $...$ for inline and $$...$$ for display mode
const INLINE_MATH_REGEX = /\$([^$\n]+)\$/g;
const DISPLAY_MATH_REGEX = /\$\$([^$]+)\$\$/g;

interface MathProps {
  latex: string;
  displayMode?: boolean;
}

function Math({ latex, displayMode = false }: MathProps) {
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false,
      trust: false,
    });

    // Sanitize HTML output for defense-in-depth
    const sanitizedHtml = DOMPurify.sanitize(html, {
      USE_PROFILES: { mathMl: true },
      ADD_TAGS: ['semantics', 'annotation'],
    });

    return (
      <span
        className={displayMode ? 'threadkit-math-display' : 'threadkit-math-inline'}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  } catch (error) {
    return (
      <span className="threadkit-math-error" title={String(error)}>
        {displayMode ? `$$${latex}$$` : `$${latex}$`}
      </span>
    );
  }
}

export interface LatexPluginOptions {
  /** Enable display math ($$...$$) - default true */
  displayMath?: boolean;
  /** Enable inline math ($...$) - default true */
  inlineMath?: boolean;
}

export function createLatexPlugin(options: LatexPluginOptions = {}): ThreadKitPlugin {
  const { displayMath = true, inlineMath = true } = options;

  return {
    name: 'latex',
    renderTokens: (text: string, registerSegment?: PluginSegmentCallback) => {
      // Reset regex state
      DISPLAY_MATH_REGEX.lastIndex = 0;
      INLINE_MATH_REGEX.lastIndex = 0;

      // Check for any math expressions
      const hasDisplayMath = displayMath && DISPLAY_MATH_REGEX.test(text);
      const hasInlineMath = inlineMath && INLINE_MATH_REGEX.test(text);

      if (!hasDisplayMath && !hasInlineMath) return null;

      // Reset regex state again after test
      DISPLAY_MATH_REGEX.lastIndex = 0;
      INLINE_MATH_REGEX.lastIndex = 0;

      // Use new callback-based approach if available
      if (registerSegment) {
        let keyIndex = 0;

        // Register display math ($$...$$)
        if (displayMath) {
          let match;
          while ((match = DISPLAY_MATH_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <Math key={`display-${keyIndex++}`} latex={match[1].trim()} displayMode />
            );
          }
        }

        // Register inline math ($...$)
        if (inlineMath) {
          let match;
          while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <Math key={`inline-${keyIndex++}`} latex={match[1].trim()} />
            );
          }
        }

        return null; // Let other plugins and markdown handle the rest
      }

      // Fallback for backwards compatibility
      const elements: React.ReactNode[] = [];
      let workingText = text;
      let keyIndex = 0;

      // First handle display math ($$...$$)
      if (displayMath) {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = DISPLAY_MATH_REGEX.exec(workingText)) !== null) {
          if (match.index > lastIndex) {
            parts.push(workingText.slice(lastIndex, match.index));
          }
          parts.push(
            <Math key={`display-${keyIndex++}`} latex={match[1].trim()} displayMode />
          );
          lastIndex = match.index + match[0].length;
        }

        if (parts.length > 0) {
          if (lastIndex < workingText.length) {
            parts.push(workingText.slice(lastIndex));
          }
          workingText = '';
          elements.push(...parts);
        }
      }

      // Then handle inline math ($...$)
      if (inlineMath && (workingText.length > 0 || elements.length === 0)) {
        const textToProcess = workingText.length > 0 ? workingText : text;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        INLINE_MATH_REGEX.lastIndex = 0;
        while ((match = INLINE_MATH_REGEX.exec(textToProcess)) !== null) {
          if (match.index > lastIndex) {
            parts.push(textToProcess.slice(lastIndex, match.index));
          }
          parts.push(
            <Math key={`inline-${keyIndex++}`} latex={match[1].trim()} />
          );
          lastIndex = match.index + match[0].length;
        }

        if (parts.length > 0) {
          if (lastIndex < textToProcess.length) {
            parts.push(textToProcess.slice(lastIndex));
          }
          return <>{parts}</>;
        }
      }

      if (elements.length > 0) {
        return <>{elements}</>;
      }

      return null;
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
