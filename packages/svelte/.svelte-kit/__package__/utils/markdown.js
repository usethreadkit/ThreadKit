import { tokenizeLine as coreTokenizeLine, escapeHtml, isSafeUrl, } from '@threadkit/core';
function tokenizeLine(text, options) {
    const tokenizerOptions = {
        allowLinks: options.allowLinks,
        enableAutoLinks: options.enableAutoLinks,
        enableMentions: options.enableMentions,
        resolveUsername: options.resolveUsername,
    };
    return coreTokenizeLine(text, tokenizerOptions);
}
function renderTokens(tokens, options) {
    return tokens.map((token) => {
        switch (token.type) {
            case 'bold':
                return `<strong>${renderTokens(tokenizeLine(token.content, options), options)}</strong>`;
            case 'italic':
                return `<em>${renderTokens(tokenizeLine(token.content, options), options)}</em>`;
            case 'strike':
                return `<del>${renderTokens(tokenizeLine(token.content, options), options)}</del>`;
            case 'code':
                return `<code class="threadkit-inline-code">${escapeHtml(token.content)}</code>`;
            case 'link': {
                if (!token.url || !isSafeUrl(token.url)) {
                    return `<span class="threadkit-unsafe-link">${escapeHtml(token.content)}</span>`;
                }
                return `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer" class="threadkit-link">${escapeHtml(token.content)}</a>`;
            }
            case 'mention':
                return `<span class="threadkit-mention" data-user-id="${escapeHtml(token.userId || token.content)}">@${escapeHtml(token.content)}</span>`;
            default:
                return escapeHtml(token.content);
        }
    }).join('');
}
export function renderMarkdown(text, options = {}) {
    // Apply plugin text transformations first
    let processedText = text;
    if (options.plugins) {
        for (const plugin of options.plugins) {
            if (plugin.transformText) {
                processedText = plugin.transformText(processedText);
            }
        }
    }
    return renderMarkdownLines(processedText, options);
}
function renderMarkdownLines(text, options) {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let inQuote = false;
    let quoteLines = [];
    let paragraphLines = [];
    const flushQuote = () => {
        if (quoteLines.length > 0) {
            const content = quoteLines.map((line, i) => renderTokens(tokenizeLine(line, options), options) + (i < quoteLines.length - 1 ? '<br>' : '')).join('');
            elements.push(`<blockquote class="threadkit-blockquote">${content}</blockquote>`);
            quoteLines = [];
            inQuote = false;
        }
    };
    const flushList = () => {
        if (currentList.length > 0) {
            const items = currentList.map((item) => `<li>${renderTokens(tokenizeLine(item, options), options)}</li>`).join('');
            elements.push(`<ul class="threadkit-list">${items}</ul>`);
            currentList = [];
        }
    };
    const flushParagraph = () => {
        if (paragraphLines.length > 0) {
            const content = paragraphLines.map((pLine, pi) => renderTokens(tokenizeLine(pLine, options), options) + (pi < paragraphLines.length - 1 ? '<br>' : '')).join('');
            elements.push(`<p class="threadkit-paragraph">${content}</p>`);
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
        }
        else if (inQuote) {
            flushQuote();
        }
        // Headings: # h1, ## h2, ### h3, etc.
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) {
            flushParagraph();
            flushQuote();
            flushList();
            const level = headingMatch[1].length;
            const content = renderTokens(tokenizeLine(headingMatch[2], options), options);
            elements.push(`<h${level} class="threadkit-heading threadkit-h${level}">${content}</h${level}>`);
            continue;
        }
        // List: * item or - item
        const listMatch = line.match(/^[*-]\s+(.+)/);
        if (listMatch) {
            flushParagraph();
            flushQuote();
            currentList.push(listMatch[1]);
            continue;
        }
        else {
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
    return elements.join('');
}
// Re-export formatting utilities from core
export { formatTimestamp, formatTime } from '@threadkit/core';
