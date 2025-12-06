// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'link'
  | 'mention';

export interface Token {
  type: TokenType;
  content: string;
  /** URL for link tokens */
  url?: string;
  /** User ID for mention tokens */
  userId?: string;
}

// ============================================================================
// Tokenizer Options
// ============================================================================

export interface TokenizerOptions {
  /** Allow [text](url) markdown links */
  allowLinks?: boolean;
  /** Auto-detect and link bare URLs */
  enableAutoLinks?: boolean;
  /** Enable @username mentions */
  enableMentions?: boolean;
  /** Callback to resolve @username to userId */
  resolveUsername?: (username: string) => string | undefined;
}

// ============================================================================
// Tokenizer Function
// ============================================================================

/**
 * Tokenize a single line of text into an array of tokens.
 * This is a pure function with no framework dependencies.
 */
export function tokenizeLine(text: string, options: TokenizerOptions = {}): Token[] {
  const tokens: Token[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push({ type: 'italic', content: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      tokens.push({ type: 'strike', content: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', content: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Links: [text](url)
    if (options.allowLinks) {
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({ type: 'link', content: linkMatch[1], url: linkMatch[2] });
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }
    }

    // Auto-links: detect bare URLs
    if (options.enableAutoLinks) {
      const urlMatch = remaining.match(/^(https?:\/\/[^\s<>"\[\]]+)/);
      if (urlMatch) {
        tokens.push({ type: 'link', content: urlMatch[1], url: urlMatch[1] });
        remaining = remaining.slice(urlMatch[0].length);
        continue;
      }
    }

    // @mentions: detect @username
    if (options.enableMentions) {
      const mentionMatch = remaining.match(/^@(\w+)/);
      if (mentionMatch) {
        const username = mentionMatch[1];
        const userId = options.resolveUsername?.(username) || username;
        tokens.push({ type: 'mention', content: username, userId });
        remaining = remaining.slice(mentionMatch[0].length);
        continue;
      }
    }

    // Plain text: consume until next special char or end
    const plainMatch = remaining.match(/^[^*`~[\]@]+/);
    if (plainMatch) {
      tokens.push({ type: 'text', content: plainMatch[0] });
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }

    // Fallback: consume single character
    tokens.push({ type: 'text', content: remaining[0] });
    remaining = remaining.slice(1);
  }

  return tokens;
}

// ============================================================================
// Block-Level Structures
// ============================================================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'list';

export interface Block {
  type: BlockType;
  level?: number; // For headings (1-6)
  lines: string[]; // Raw lines for the block
}

/**
 * Parse text into block-level structures.
 * Returns blocks that can be rendered by framework-specific code.
 */
export function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let currentBlock: Block | null = null;

  const flushBlock = () => {
    if (currentBlock && currentBlock.lines.length > 0) {
      blocks.push(currentBlock);
    }
    currentBlock = null;
  };

  for (const line of lines) {
    // Heading: # h1, ## h2, ### h3, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushBlock();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        lines: [headingMatch[2]],
      });
      continue;
    }

    // Quote: > text
    if (line.startsWith('> ')) {
      if (currentBlock?.type !== 'quote') {
        flushBlock();
        currentBlock = { type: 'quote', lines: [] };
      }
      currentBlock!.lines.push(line.slice(2));
      continue;
    }

    // List: * item or - item
    const listMatch = line.match(/^[*-]\s+(.+)/);
    if (listMatch) {
      if (currentBlock?.type !== 'list') {
        flushBlock();
        currentBlock = { type: 'list', lines: [] };
      }
      currentBlock!.lines.push(listMatch[1]);
      continue;
    }

    // Empty line = end current block
    if (line.trim() === '') {
      flushBlock();
      continue;
    }

    // Regular text
    if (currentBlock?.type !== 'paragraph') {
      flushBlock();
      currentBlock = { type: 'paragraph', lines: [] };
    }
    currentBlock!.lines.push(line);
  }

  flushBlock();
  return blocks;
}

// ============================================================================
// URL Safety Check
// ============================================================================

/**
 * Check if a URL is safe (not javascript:, data:, vbscript:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  return !url.match(/^\s*(javascript|data|vbscript):/i);
}
