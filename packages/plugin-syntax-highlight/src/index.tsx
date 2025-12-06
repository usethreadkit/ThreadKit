import React, { useState, useEffect } from 'react';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import type { ThreadKitPlugin, PluginSegmentCallback } from '@threadkit/react';

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

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

interface CodeBlockProps {
  code: string;
  language: string;
  theme?: 'light' | 'dark';
}

function CodeBlock({ code, language, theme = 'dark' }: CodeBlockProps) {
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

export interface SyntaxHighlightPluginOptions {
  theme?: 'light' | 'dark';
  /** Additional languages to load */
  additionalLanguages?: string[];
}

export function createSyntaxHighlightPlugin(options: SyntaxHighlightPluginOptions = {}): ThreadKitPlugin {
  const { theme = 'dark' } = options;

  return {
    name: 'syntax-highlight',
    renderTokens: (text: string, registerSegment?: PluginSegmentCallback) => {
      const matches = [...text.matchAll(CODE_BLOCK_REGEX)];
      if (matches.length === 0) return null;

      // Use new callback-based approach if available
      if (registerSegment) {
        matches.forEach((match, i) => {
          const [fullMatch, lang = 'text', code] = match;
          const startIndex = match.index!;
          registerSegment(
            startIndex,
            startIndex + fullMatch.length,
            <CodeBlock key={`code-${i}`} code={code.trim()} language={lang} theme={theme} />
          );
        });
        return null; // Let other plugins and markdown handle the rest
      }

      // Fallback for backwards compatibility
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;

      matches.forEach((match, i) => {
        const [fullMatch, lang = 'text', code] = match;
        const startIndex = match.index!;

        if (startIndex > lastIndex) {
          elements.push(<span key={`text-${i}`}>{text.slice(lastIndex, startIndex)}</span>);
        }

        elements.push(
          <CodeBlock key={`code-${i}`} code={code.trim()} language={lang} theme={theme} />
        );

        lastIndex = startIndex + fullMatch.length;
      });

      if (lastIndex < text.length) {
        elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
      }

      return <>{elements}</>;
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
