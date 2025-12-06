import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseMarkdown } from '../src/utils/markdown';

describe('parseMarkdown', () => {
  describe('bold text', () => {
    it('renders bold text with **', () => {
      const { container } = render(<>{parseMarkdown('This is **bold** text')}</>);
      expect(container.querySelector('strong')).toHaveTextContent('bold');
    });

    it('renders multiple bold sections', () => {
      const { container } = render(<>{parseMarkdown('**one** and **two**')}</>);
      const strongs = container.querySelectorAll('strong');
      expect(strongs).toHaveLength(2);
      expect(strongs[0]).toHaveTextContent('one');
      expect(strongs[1]).toHaveTextContent('two');
    });
  });

  describe('italic text', () => {
    it('renders italic text with *', () => {
      const { container } = render(<>{parseMarkdown('This is *italic* text')}</>);
      expect(container.querySelector('em')).toHaveTextContent('italic');
    });

    it('distinguishes between bold and italic', () => {
      const { container } = render(<>{parseMarkdown('**bold** and *italic*')}</>);
      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
    });
  });

  describe('strikethrough text', () => {
    it('renders strikethrough with ~~', () => {
      const { container } = render(<>{parseMarkdown('This is ~~deleted~~ text')}</>);
      expect(container.querySelector('del')).toHaveTextContent('deleted');
    });
  });

  describe('inline code', () => {
    it('renders inline code with backticks', () => {
      const { container } = render(<>{parseMarkdown('Use `console.log()` for debugging')}</>);
      const code = container.querySelector('code');
      expect(code).toHaveTextContent('console.log()');
      expect(code).toHaveClass('threadkit-inline-code');
    });

    it('renders multiple code spans', () => {
      const { container } = render(<>{parseMarkdown('`foo` and `bar`')}</>);
      const codes = container.querySelectorAll('code');
      expect(codes).toHaveLength(2);
    });
  });

  describe('links', () => {
    it('renders links when allowLinks is true', () => {
      const { container } = render(
        <>{parseMarkdown('[Click here](https://example.com)', { allowLinks: true })}</>
      );
      const link = container.querySelector('a');
      expect(link).toHaveTextContent('Click here');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render links when allowLinks is false', () => {
      const { container } = render(
        <>{parseMarkdown('[Click here](https://example.com)', { allowLinks: false })}</>
      );
      expect(container.querySelector('a')).not.toBeInTheDocument();
      expect(container.textContent).toContain('[Click here](https://example.com)');
    });

    it('does not render links by default', () => {
      const { container } = render(
        <>{parseMarkdown('[Click here](https://example.com)')}</>
      );
      expect(container.querySelector('a')).not.toBeInTheDocument();
    });
  });

  describe('blockquotes', () => {
    it('renders blockquote with >', () => {
      const { container } = render(<>{parseMarkdown('> This is a quote')}</>);
      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toHaveTextContent('This is a quote');
      expect(blockquote).toHaveClass('threadkit-blockquote');
    });

    it('renders multi-line blockquotes', () => {
      const { container } = render(<>{parseMarkdown('> Line one\n> Line two')}</>);
      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toHaveTextContent('Line oneLine two');
    });
  });

  describe('lists', () => {
    it('renders unordered list with *', () => {
      const { container } = render(<>{parseMarkdown('* Item 1\n* Item 2\n* Item 3')}</>);
      const list = container.querySelector('ul');
      expect(list).toHaveClass('threadkit-list');
      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('Item 1');
      expect(items[1]).toHaveTextContent('Item 2');
      expect(items[2]).toHaveTextContent('Item 3');
    });

    it('renders unordered list with -', () => {
      const { container } = render(<>{parseMarkdown('- First\n- Second')}</>);
      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(2);
    });

    it('applies formatting within list items', () => {
      const { container } = render(<>{parseMarkdown('* **Bold** item\n* *Italic* item')}</>);
      expect(container.querySelector('strong')).toHaveTextContent('Bold');
      expect(container.querySelector('em')).toHaveTextContent('Italic');
    });
  });

  describe('nested formatting', () => {
    // Note: Full nested formatting (bold inside italic) is not supported by our simple parser
    // These tests verify that individual formatting still works in proximity

    it('renders bold followed by italic', () => {
      const { container } = render(<>{parseMarkdown('**bold** *italic*')}</>);
      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
    });

    it('renders code inside bold', () => {
      const { container } = render(<>{parseMarkdown('**use `code` here**')}</>);
      expect(container.querySelector('strong code')).toHaveTextContent('code');
    });
  });

  describe('multiline text', () => {
    it('renders line breaks', () => {
      const { container } = render(<>{parseMarkdown('Line 1\nLine 2')}</>);
      expect(container.querySelectorAll('br').length).toBeGreaterThan(0);
    });

    it('renders empty lines as paragraph breaks', () => {
      const { container } = render(<>{parseMarkdown('Before\n\nAfter')}</>);
      // Double newline creates separate paragraphs in markdown
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]).toHaveTextContent('Before');
      expect(paragraphs[1]).toHaveTextContent('After');
    });
  });

  describe('plain text', () => {
    it('renders plain text without formatting', () => {
      const { container } = render(<>{parseMarkdown('Just plain text')}</>);
      expect(container.textContent).toBe('Just plain text');
      expect(container.querySelector('strong')).not.toBeInTheDocument();
      expect(container.querySelector('em')).not.toBeInTheDocument();
    });

    it('handles special characters', () => {
      const { container } = render(<>{parseMarkdown('Hello <world> & friends')}</>);
      expect(container.textContent).toBe('Hello <world> & friends');
    });
  });

  describe('complex formatting', () => {
    it('handles a mix of formatting', () => {
      const text = '**Bold** and *italic* with `code` and ~~strike~~';
      const { container } = render(<>{parseMarkdown(text)}</>);

      expect(container.querySelector('strong')).toHaveTextContent('Bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
      expect(container.querySelector('code')).toHaveTextContent('code');
      expect(container.querySelector('del')).toHaveTextContent('strike');
    });

    it('handles formatting in quotes', () => {
      const { container } = render(<>{parseMarkdown('> **Bold** quote')}</>);
      expect(container.querySelector('blockquote strong')).toHaveTextContent('Bold');
    });
  });
});
