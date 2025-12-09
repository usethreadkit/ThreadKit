import React from 'react';
import {
  type Token,
  type TokenizerOptions,
  tokenizeLine as coreTokenizeLine,
  isSafeUrl,
} from '@threadkit/core';
import type { ThreadKitPlugin, UserProfile } from '../types';
import { UserHoverCard } from '../components/UserHoverCard';
import { renderPluginInstruction } from '../renderers';

export interface MarkdownOptions {
  allowLinks?: boolean;
  enableAutoLinks?: boolean;
  enableMentions?: boolean;
  plugins?: ThreadKitPlugin[];
  /** Callback to get user profile for @mention hover cards */
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
  /** Callback to resolve @username to userId */
  resolveUsername?: (username: string) => string | undefined;
}

function tokenizeLine(text: string, options: MarkdownOptions): Token[] {
  const tokenizerOptions: TokenizerOptions = {
    allowLinks: options.allowLinks,
    enableAutoLinks: options.enableAutoLinks,
    enableMentions: options.enableMentions,
    resolveUsername: options.resolveUsername,
  };
  return coreTokenizeLine(text, tokenizerOptions);
}

function renderTokens(tokens: Token[], options: MarkdownOptions): React.ReactNode[] {
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return <strong key={i}>{renderTokens(tokenizeLine(token.content, options), options)}</strong>;
      case 'italic':
        return <em key={i}>{renderTokens(tokenizeLine(token.content, options), options)}</em>;
      case 'strike':
        return <del key={i}>{renderTokens(tokenizeLine(token.content, options), options)}</del>;
      case 'code':
        return <code key={i} className="threadkit-inline-code">{token.content}</code>;
      case 'link':
        if (!token.url || !isSafeUrl(token.url)) {
          return <span key={i} className="threadkit-unsafe-link">{token.content}</span>;
        }
        return (
          <a
            key={i}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="threadkit-link"
          >
            {token.content}
          </a>
        );
      case 'mention':
        if (options.getUserProfile) {
          return (
            <UserHoverCard
              key={i}
              userId={token.userId || token.content}
              getUserProfile={options.getUserProfile}
              fetchUserProfile={options.fetchUserProfile}
            >
              <span className="threadkit-mention">@{token.content}</span>
            </UserHoverCard>
          );
        }
        return <span key={i} className="threadkit-mention">@{token.content}</span>;
      default:
        return <React.Fragment key={i}>{token.content}</React.Fragment>;
    }
  });
}

export function renderMarkdown(text: string, options: MarkdownOptions = {}): React.ReactNode {
  // Guard against undefined/null text
  if (text == null) {
    console.error('[ThreadKit] renderMarkdown called with undefined/null text');
    return null;
  }

  try {
    // Apply plugin text transformations first
    let processedText = String(text);
    if (options.plugins) {
      for (const plugin of options.plugins) {
        if (plugin.transformText) {
          processedText = plugin.transformText(processedText);
        }
      }
    }

  // Collect rendered segments from ALL plugins
  if (options.plugins && options.plugins.length > 0) {
    const segments: Array<{
      start: number;
      end: number;
      render: React.ReactNode;
      priority: number;
    }> = [];

    // Let each plugin find and render its matches using the universal findSegments approach
    options.plugins.forEach((plugin, pluginIndex) => {
      if (plugin.findSegments) {
        const pluginSegments = plugin.findSegments(processedText);
        pluginSegments.forEach((seg, segIndex) => {
          const rendered = renderPluginInstruction(seg.instruction, `${plugin.name}-${segIndex}`);
          if (rendered) {
            segments.push({ start: seg.start, end: seg.end, render: rendered, priority: pluginIndex });
          }
        });
      }
    });

    // If we have segments, compose them with the remaining text
    if (segments.length > 0) {
      // Sort by start position, then by priority (earlier plugins win overlaps)
      segments.sort((a, b) => a.start - b.start || a.priority - b.priority);

      // Remove overlapping segments (keep first/higher priority)
      const nonOverlapping: typeof segments = [];
      let lastEnd = 0;
      for (const seg of segments) {
        if (seg.start >= lastEnd) {
          nonOverlapping.push(seg);
          lastEnd = seg.end;
        }
      }

      // Build the final result
      const elements: React.ReactNode[] = [];
      let currentPos = 0;

      for (let i = 0; i < nonOverlapping.length; i++) {
        const seg = nonOverlapping[i];
        // Render text before this segment
        if (seg.start > currentPos) {
          const textBefore = processedText.slice(currentPos, seg.start);
          // Check for paragraph breaks
          const lastParaBreak = textBefore.lastIndexOf('\n\n');
          if (lastParaBreak !== -1) {
            // Split: render paragraphs before, then inline text right before segment
            const paraContent = textBefore.slice(0, lastParaBreak);
            const inlineContent = textBefore.slice(lastParaBreak + 2); // skip the \n\n
            if (paraContent) {
              elements.push(
                <React.Fragment key={`para-${i}`}>
                  {renderMarkdownLines(paraContent, options)}
                </React.Fragment>
              );
            }
            if (inlineContent) {
              elements.push(
                <React.Fragment key={`text-${i}`}>
                  {renderTokens(tokenizeLine(inlineContent.replace(/\n/g, ' '), options), options)}
                </React.Fragment>
              );
            }
          } else {
            // No paragraph breaks - render inline
            elements.push(
              <React.Fragment key={`text-${i}`}>
                {renderTokens(tokenizeLine(textBefore.replace(/\n/g, ' '), options), options)}
              </React.Fragment>
            );
          }
        }
        // Add the plugin-rendered segment
        elements.push(<React.Fragment key={`seg-${i}`}>{seg.render}</React.Fragment>);
        currentPos = seg.end;
      }

      // Render remaining text after last segment
      if (currentPos < processedText.length) {
        const textAfter = processedText.slice(currentPos);
        // If text has paragraph breaks, use full parser; otherwise render inline
        if (textAfter.includes('\n\n')) {
          elements.push(
            <React.Fragment key="text-end">
              {renderMarkdownLines(textAfter, options)}
            </React.Fragment>
          );
        } else {
          elements.push(
            <React.Fragment key="text-end">
              {renderTokens(tokenizeLine(textAfter.replace(/\n/g, ' '), options), options)}
            </React.Fragment>
          );
        }
      }

      return <>{elements}</>;
    }
  }

    return renderMarkdownLines(processedText, options);
  } catch (err) {
    console.error('[ThreadKit] Error rendering markdown:', err);
    // Fallback: return plain text
    return <span>{String(text)}</span>;
  }
}

function renderMarkdownLines(text: string, options: MarkdownOptions): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inQuote = false;
  let quoteLines: string[] = [];

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="threadkit-blockquote">
          {quoteLines.map((line, i) => (
            <React.Fragment key={i}>
              {renderTokens(tokenizeLine(line, options), options)}
              {i < quoteLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </blockquote>
      );
      quoteLines = [];
      inQuote = false;
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="threadkit-list">
          {currentList.map((item, i) => (
            <li key={i}>{renderTokens(tokenizeLine(item, options), options)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      elements.push(
        <p key={`p-${elements.length}`} className="threadkit-paragraph">
          {paragraphLines.map((pLine, pi) => (
            <React.Fragment key={pi}>
              {renderTokens(tokenizeLine(pLine, options), options)}
              {pi < paragraphLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
      paragraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Quote: > text
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      inQuote = true;
      quoteLines.push(line.slice(2));
      continue;
    } else if (inQuote) {
      flushQuote();
    }

    // Headings: # h1, ## h2, ### h3, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushParagraph();
      flushQuote();
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingContent = renderTokens(tokenizeLine(content, options), options);
      const className = `threadkit-heading threadkit-h${level}`;
      const key = `heading-${elements.length}`;

      if (level === 1) elements.push(<h1 key={key} className={className}>{headingContent}</h1>);
      else if (level === 2) elements.push(<h2 key={key} className={className}>{headingContent}</h2>);
      else if (level === 3) elements.push(<h3 key={key} className={className}>{headingContent}</h3>);
      else if (level === 4) elements.push(<h4 key={key} className={className}>{headingContent}</h4>);
      else if (level === 5) elements.push(<h5 key={key} className={className}>{headingContent}</h5>);
      else elements.push(<h6 key={key} className={className}>{headingContent}</h6>);
      continue;
    }

    // List: * item or - item
    const listMatch = line.match(/^[*-]\s+(.+)/);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      currentList.push(listMatch[1]);
      continue;
    } else {
      flushList();
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Regular text line - accumulate into paragraph
    paragraphLines.push(line);
  }

  flushParagraph();
  flushQuote();
  flushList();

  return <>{elements}</>;
}
