import React from 'react';
import type { LatexRenderProps } from '@threadkit/plugin-latex';

// Lazy load katex and dompurify only when needed
let katexPromise: Promise<typeof import('katex')> | null = null;
let dompurifyPromise: Promise<typeof import('dompurify')> | null = null;

async function getKatex() {
  if (!katexPromise) {
    katexPromise = import('katex');
  }
  return katexPromise;
}

async function getDompurify() {
  if (!dompurifyPromise) {
    dompurifyPromise = import('dompurify');
  }
  return dompurifyPromise;
}

/**
 * React component for rendering LaTeX expressions using KaTeX.
 * Used by the markdown renderer when it encounters a 'latex' plugin instruction.
 */
export function LatexRenderer({ expression, displayMode }: LatexRenderProps) {
  const [html, setHtml] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([getKatex(), getDompurify()]).then(([katexModule, dompurifyModule]) => {
      if (cancelled) return;

      try {
        const katex = katexModule.default;
        const DOMPurify = dompurifyModule.default;

        const rendered = katex.renderToString(expression, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: false,
        });

        // Sanitize HTML output for defense-in-depth
        const sanitized = DOMPurify.sanitize(rendered, {
          USE_PROFILES: { mathMl: true },
          ADD_TAGS: ['semantics', 'annotation'],
        });

        setHtml(sanitized);
        setError(null);
      } catch (err) {
        setError(String(err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [expression, displayMode]);

  if (error) {
    return (
      <span className="threadkit-math-error" title={error}>
        {displayMode ? `$$${expression}$$` : `$${expression}$`}
      </span>
    );
  }

  if (!html) {
    // Placeholder while loading
    return (
      <span className={displayMode ? 'threadkit-math-display' : 'threadkit-math-inline'}>
        {displayMode ? `$$${expression}$$` : `$${expression}$`}
      </span>
    );
  }

  return (
    <span
      className={displayMode ? 'threadkit-math-display' : 'threadkit-math-inline'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
