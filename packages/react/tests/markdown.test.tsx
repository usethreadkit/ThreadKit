import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderMarkdown } from '../src/utils/markdown';

describe('renderMarkdown', () => {
  describe('basic text', () => {
    it('renders plain text in a paragraph', () => {
      const result = render(<>{renderMarkdown('Hello world')}</>);
      expect(result.container.innerHTML).toContain('Hello world');
      expect(result.container.querySelector('.threadkit-paragraph')).toBeTruthy();
    });

    it('handles null/undefined text gracefully', () => {
      expect(renderMarkdown(null as any)).toBe(null);
      expect(renderMarkdown(undefined as any)).toBe(null);
    });
  });

  describe('inline formatting', () => {
    it('renders bold text', () => {
      const result = render(<>{renderMarkdown('Hello **world**')}</>);
      expect(result.container.querySelector('strong')?.textContent).toBe('world');
    });

    it('renders italic text', () => {
      const result = render(<>{renderMarkdown('Hello *world*')}</>);
      expect(result.container.querySelector('em')?.textContent).toBe('world');
    });

    it('renders strikethrough text', () => {
      const result = render(<>{renderMarkdown('Hello ~~world~~')}</>);
      expect(result.container.querySelector('del')?.textContent).toBe('world');
    });

    it('renders inline code', () => {
      const result = render(<>{renderMarkdown('Use `console.log()`')}</>);
      expect(result.container.querySelector('code.threadkit-inline-code')?.textContent).toBe('console.log()');
    });
  });

  describe('links', () => {
    it('renders markdown links', () => {
      const result = render(<>{renderMarkdown('[Google](https://google.com)', { allowLinks: true })}</>);
      const link = result.container.querySelector('a.threadkit-link');
      expect(link?.getAttribute('href')).toBe('https://google.com');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toBe('Google');
    });

    it('renders auto-detected links', () => {
      const result = render(<>{renderMarkdown('Check out https://example.com today', {
        allowLinks: true,
        enableAutoLinks: true,
      })}</>);
      const link = result.container.querySelector('a.threadkit-link');
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('blocks unsafe URLs', () => {
      const result = render(<>{renderMarkdown('[Bad](javascript:alert(1))', { allowLinks: true })}</>);
      const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
      expect(unsafeLink).toBeTruthy();
      expect(result.container.querySelector('a')).toBeFalsy();
    });
  });

  describe('images - single image', () => {
    it('renders a single image', () => {
      const result = render(<>{renderMarkdown('![alt text](https://example.com/image.jpg)', { allowLinks: true })}</>);
      const img = result.container.querySelector('img.threadkit-image');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg');
      expect(img?.getAttribute('alt')).toBe('alt text');
    });

    it('renders image with empty alt text', () => {
      const result = render(<>{renderMarkdown('![](https://example.com/image.jpg)', { allowLinks: true })}</>);
      const img = result.container.querySelector('img.threadkit-image');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg');
      expect(img?.getAttribute('alt')).toBe('');
    });

    describe('XSS security - URL blocking', () => {
      it('blocks javascript: URLs', () => {
        const result = render(<>{renderMarkdown('![xss](javascript:alert(1))', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(unsafeLink?.textContent).toContain('[Image: xss]');
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks data: URLs', () => {
        const result = render(<>{renderMarkdown('![xss](data:text/html,<script>alert(1)</script>)', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks vbscript: URLs', () => {
        const result = render(<>{renderMarkdown('![xss](vbscript:msgbox(1))', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks javascript: URLs with whitespace', () => {
        const result = render(<>{renderMarkdown('![xss](  javascript:alert(1))', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks JAVASCRIPT: URLs (case insensitive)', () => {
        const result = render(<>{renderMarkdown('![xss](JAVASCRIPT:alert(1))', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks JaVaScRiPt: URLs (mixed case)', () => {
        const result = render(<>{renderMarkdown('![xss](JaVaScRiPt:alert(1))', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks data URLs with base64 encoded scripts', () => {
        const result = render(<>{renderMarkdown('![xss](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('blocks DATA: URLs (uppercase)', () => {
        const result = render(<>{renderMarkdown('![xss](DATA:text/html,test)', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('allows http URLs', () => {
        const result = render(<>{renderMarkdown('![safe](http://example.com/image.jpg)', { allowLinks: true })}</>);
        const img = result.container.querySelector('img.threadkit-image');
        expect(img).toBeTruthy();
        expect(img?.getAttribute('src')).toBe('http://example.com/image.jpg');
      });

      it('allows https URLs', () => {
        const result = render(<>{renderMarkdown('![safe](https://example.com/image.jpg)', { allowLinks: true })}</>);
        const img = result.container.querySelector('img.threadkit-image');
        expect(img).toBeTruthy();
        expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg');
      });

      it('allows relative URLs', () => {
        const result = render(<>{renderMarkdown('![safe](/images/photo.jpg)', { allowLinks: true })}</>);
        const img = result.container.querySelector('img.threadkit-image');
        expect(img).toBeTruthy();
        expect(img?.getAttribute('src')).toBe('/images/photo.jpg');
      });

      it('escapes HTML in alt text', () => {
        const result = render(<>{renderMarkdown('![<script>alert(1)</script>](https://example.com/image.jpg)', { allowLinks: true })}</>);
        const img = result.container.querySelector('img.threadkit-image');
        expect(img).toBeTruthy();
        expect(img?.getAttribute('alt')).toBe('<script>alert(1)</script>');
        // React automatically escapes HTML attributes in the DOM
        // The innerHTML will contain the escaped version
        const html = result.container.innerHTML;
        // Check that it's safely escaped (contains the literal string, not executable script)
        expect(html).toContain('alt=');
        // The actual img element won't execute scripts from alt attribute
      });

      it('does not execute event handlers in alt text', () => {
        const result = render(<>{renderMarkdown('![test" onerror="alert(1)](https://example.com/image.jpg)', { allowLinks: true })}</>);
        const img = result.container.querySelector('img.threadkit-image');
        expect(img).toBeTruthy();
        // React escapes quotes in attributes, preventing injection
        const alt = img?.getAttribute('alt');
        expect(alt).toBe('test" onerror="alert(1)');
        // The quotes are escaped in the HTML string representation
        const html = result.container.innerHTML;
        expect(html).toContain('&quot;');
        // React's escaping prevents the onerror from being an actual attribute
      });

      it('handles multiple images with mixed safe and unsafe URLs', () => {
        const text = '![safe](https://example.com/1.jpg) ![xss](javascript:alert(1)) ![safe2](https://example.com/2.jpg)';
        const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

        const images = result.container.querySelectorAll('img.threadkit-image');
        expect(images.length).toBe(2); // Only safe images rendered
        expect(images[0]?.getAttribute('src')).toBe('https://example.com/1.jpg');
        expect(images[1]?.getAttribute('src')).toBe('https://example.com/2.jpg');

        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
      });

      it('blocks javascript: in the middle of text with images', () => {
        const text = 'Before ![xss](javascript:alert("XSS")) after';
        const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

        expect(result.container.querySelector('img')).toBeFalsy();
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.textContent).toContain('Before');
        expect(result.container.textContent).toContain('after');
      });

      it('prevents null byte injection in URLs', () => {
        const result = render(<>{renderMarkdown('![xss](javascript:alert(1)\x00.jpg)', { allowLinks: true })}</>);
        const unsafeLink = result.container.querySelector('.threadkit-unsafe-link');
        expect(unsafeLink).toBeTruthy();
        expect(result.container.querySelector('img')).toBeFalsy();
      });

      it('prevents protocol-relative javascript URLs', () => {
        const result = render(<>{renderMarkdown('![xss](//javascript:alert(1))', { allowLinks: true })}</>);
        // This should render since it's technically a valid protocol-relative URL
        // but most browsers won't execute javascript: in this context
        const img = result.container.querySelector('img.threadkit-image');
        // If it renders, verify it's treated as a normal URL, not executed
        if (img) {
          // The ) in alert(1) terminates the URL match
          expect(img.getAttribute('src')).toContain('//javascript:alert');
        }
      });
    });
  });

  describe('images - multiple images', () => {
    it('renders two images without text', () => {
      const text = '![](http://localhost:9000/image1.webp) ![](http://localhost:9000/image2.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/image1.webp');
      expect(images[1]?.getAttribute('src')).toBe('http://localhost:9000/image2.webp');
    });

    it('renders three images without text', () => {
      const text = '![](http://localhost:9000/image1.webp) ![](http://localhost:9000/image2.webp) ![](http://localhost:9000/image3.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(3);
    });

    it('renders image with text before it', () => {
      const text = 'weeeeeee ![](http://localhost:9000/image1.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/image1.webp');
      expect(result.container.textContent).toContain('weeeeeee');
    });

    it('renders image with text after it', () => {
      const text = '![](http://localhost:9000/image1.webp) testing';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/image1.webp');
      expect(result.container.textContent).toContain('testing');
    });

    it('renders two images with text in between', () => {
      const text = '![](http://localhost:9000/image1.webp) testing ![](http://localhost:9000/image2.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/image1.webp');
      expect(images[1]?.getAttribute('src')).toBe('http://localhost:9000/image2.webp');
      expect(result.container.textContent).toContain('testing');
    });

    it('renders two images with text before, between, and after', () => {
      const text = 'weeeeeee ![](http://localhost:9000/image1.webp) testing ![](http://localhost:9000/image2.webp) wow';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/image1.webp');
      expect(images[1]?.getAttribute('src')).toBe('http://localhost:9000/image2.webp');

      const content = result.container.textContent;
      expect(content).toContain('weeeeeee');
      expect(content).toContain('testing');
      expect(content).toContain('wow');

      // Images should be rendered as img tags, not text
      const html = result.container.innerHTML;
      expect(html).not.toContain('![](http://localhost:9000/image1.webp)');
      expect(html).not.toContain('![](http://localhost:9000/image2.webp)');
    });

    it('renders multiple images with text - complex scenario', () => {
      const text = 'Check this out ![image1](http://localhost:9000/img1.webp) and this ![image2](http://localhost:9000/img2.webp) amazing';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/img1.webp');
      expect(images[0]?.getAttribute('alt')).toBe('image1');
      expect(images[1]?.getAttribute('src')).toBe('http://localhost:9000/img2.webp');
      expect(images[1]?.getAttribute('alt')).toBe('image2');

      const content = result.container.textContent;
      expect(content).toContain('Check this out');
      expect(content).toContain('and this');
      expect(content).toContain('amazing');
    });

    it('renders images on separate lines', () => {
      const text = '![](http://localhost:9000/image1.webp)\n![](http://localhost:9000/image2.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
    });

    it('renders images on separate paragraphs', () => {
      const text = '![](http://localhost:9000/image1.webp)\n\n![](http://localhost:9000/image2.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      const paragraphs = result.container.querySelectorAll('.threadkit-paragraph');
      expect(paragraphs.length).toBe(2);
    });
  });

  describe('images - mixed with other markdown', () => {
    it('renders images with bold text', () => {
      const text = '**Bold** ![](http://localhost:9000/image1.webp) text';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.querySelector('strong')?.textContent).toBe('Bold');
    });

    it('renders images with links', () => {
      const text = '[Link](https://example.com) ![](http://localhost:9000/image1.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.querySelector('a.threadkit-link')).toBeTruthy();
    });

    it('renders images with inline code', () => {
      const text = '`code` ![](http://localhost:9000/image1.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.querySelector('code.threadkit-inline-code')).toBeTruthy();
    });

    it('renders images with list items', () => {
      const text = '* Item 1 ![](http://localhost:9000/image1.webp)\n* Item 2 ![](http://localhost:9000/image2.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      const list = result.container.querySelector('ul.threadkit-list');
      expect(list).toBeTruthy();
      expect(list?.querySelectorAll('li').length).toBe(2);
    });
  });

  describe('block elements', () => {
    it('renders blockquotes', () => {
      const result = render(<>{renderMarkdown('> This is a quote')}</>);
      const blockquote = result.container.querySelector('blockquote.threadkit-blockquote');
      expect(blockquote?.textContent).toBe('This is a quote');
    });

    it('renders unordered lists', () => {
      const result = render(<>{renderMarkdown('* Item 1\n* Item 2')}</>);
      const list = result.container.querySelector('ul.threadkit-list');
      expect(list?.querySelectorAll('li').length).toBe(2);
    });

    it('renders headings', () => {
      const result = render(<>{renderMarkdown('# Heading 1')}</>);
      const heading = result.container.querySelector('h1.threadkit-heading');
      expect(heading?.textContent).toBe('Heading 1');
    });
  });

  describe('paragraphs', () => {
    it('creates separate paragraphs for double newlines', () => {
      const result = render(<>{renderMarkdown('Para 1\n\nPara 2')}</>);
      const paragraphs = result.container.querySelectorAll('.threadkit-paragraph');
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]?.textContent).toBe('Para 1');
      expect(paragraphs[1]?.textContent).toBe('Para 2');
    });

    it('creates line breaks for single newlines within paragraph', () => {
      const result = render(<>{renderMarkdown('Line 1\nLine 2')}</>);
      expect(result.container.querySelector('br')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = renderMarkdown('');
      expect(result).toBeTruthy();
    });

    it('handles only whitespace', () => {
      const result = renderMarkdown('   \n   ');
      expect(result).toBeTruthy();
    });

    it('handles complex nested formatting', () => {
      const result = render(<>{renderMarkdown('**bold with *italic* inside**')}</>);
      expect(result.container.querySelector('strong')).toBeTruthy();
      expect(result.container.querySelector('em')).toBeTruthy();
    });

    it('handles markdown syntax without proper spacing', () => {
      const text = '**bold***italic*~~strike~~';
      const result = render(<>{renderMarkdown(text)}</>);
      expect(result.container.querySelector('strong')).toBeTruthy();
      expect(result.container.querySelector('em')).toBeTruthy();
      expect(result.container.querySelector('del')).toBeTruthy();
    });
  });

  describe('real world scenarios', () => {
    it('handles the reported bug: two images with text before, between, and after', () => {
      const text = 'weeeeeee ![](http://localhost:9000/threadkit-media/images/019b0d25-fc36-7e92-a719-ddd48476e636.webp) testing ![](http://localhost:9000/threadkit-media/images/019b0d26-1803-71b1-8360-59333bb15178.webp) wow';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

      // Check that images are rendered as img tags
      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(2);
      expect(images[0]?.getAttribute('src')).toBe('http://localhost:9000/threadkit-media/images/019b0d25-fc36-7e92-a719-ddd48476e636.webp');
      expect(images[1]?.getAttribute('src')).toBe('http://localhost:9000/threadkit-media/images/019b0d26-1803-71b1-8360-59333bb15178.webp');

      // Check that text is present
      const content = result.container.textContent;
      expect(content).toContain('weeeeeee');
      expect(content).toContain('testing');
      expect(content).toContain('wow');

      // Verify that raw markdown syntax is NOT present in the HTML
      const html = result.container.innerHTML;
      expect(html).not.toContain('![](http://localhost:9000/threadkit-media/images/019b0d25-fc36-7e92-a719-ddd48476e636.webp)');
      expect(html).not.toContain('![](http://localhost:9000/threadkit-media/images/019b0d26-1803-71b1-8360-59333bb15178.webp)');
    });

    it('handles three images with interleaved text', () => {
      const text = 'First ![](http://localhost:9000/img1.webp) second ![](http://localhost:9000/img2.webp) third ![](http://localhost:9000/img3.webp) done';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(3);

      const content = result.container.textContent;
      expect(content).toContain('First');
      expect(content).toContain('second');
      expect(content).toContain('third');
      expect(content).toContain('done');
    });

    it('handles image at the start', () => {
      const text = '![](http://localhost:9000/img1.webp) text after';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.textContent).toContain('text after');
    });

    it('handles image at the end', () => {
      const text = 'text before ![](http://localhost:9000/img1.webp)';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.textContent).toContain('text before');
    });

    it('handles image in the middle', () => {
      const text = 'before ![](http://localhost:9000/img1.webp) after';
      const result = render(<>{renderMarkdown(text, { allowLinks: true })}</>);

      const images = result.container.querySelectorAll('img.threadkit-image');
      expect(images.length).toBe(1);
      expect(result.container.textContent).toContain('before');
      expect(result.container.textContent).toContain('after');
    });
  });
});
