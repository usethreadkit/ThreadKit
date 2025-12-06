import { useState, useEffect } from 'react';
import type { CodeBlockRenderProps } from '@threadkit/plugin-syntax-highlight';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;
let highlighterInstance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance;
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'json', 'html', 'css', 'bash', 'sql', 'markdown'],
    });
  }
  highlighterInstance = await highlighterPromise;
  return highlighterInstance;
}

/**
 * React component for rendering syntax-highlighted code blocks using Shiki.
 * Used by the markdown renderer when it encounters a 'code-block' plugin instruction.
 */
export function CodeBlockRenderer({ code, language, theme = 'dark' }: CodeBlockRenderProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const langs = highlighter.getLoadedLanguages();
      const lang = langs.includes(language as BundledLanguage) ? language : 'text';
      const highlighted = highlighter.codeToHtml(code, {
        lang: lang as BundledLanguage,
        theme: theme === 'dark' ? 'github-dark' : 'github-light',
      });
      setHtml(highlighted);
    });
    return () => { cancelled = true; };
  }, [code, language, theme]);

  if (!html) {
    return (
      <pre className="threadkit-code-block">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="threadkit-code-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
