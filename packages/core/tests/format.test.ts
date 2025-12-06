import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimestamp, formatTime, formatDate, escapeHtml } from '../src/utils/format';

describe('format utilities', () => {
  describe('formatTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for timestamps less than a minute ago', () => {
      const timestamp = Date.now() - 30 * 1000; // 30 seconds ago
      expect(formatTimestamp(timestamp)).toBe('just now');
    });

    it('returns "1 minute ago" for one minute', () => {
      const timestamp = Date.now() - 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('1 minute ago');
    });

    it('returns "X minutes ago" for multiple minutes', () => {
      const timestamp = Date.now() - 5 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('5 minutes ago');
    });

    it('returns "1 hour ago" for one hour', () => {
      const timestamp = Date.now() - 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('1 hour ago');
    });

    it('returns "X hours ago" for multiple hours', () => {
      const timestamp = Date.now() - 3 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('3 hours ago');
    });

    it('returns "1 day ago" for one day', () => {
      const timestamp = Date.now() - 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('1 day ago');
    });

    it('returns "X days ago" for multiple days', () => {
      const timestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('7 days ago');
    });

    it('returns "1 month ago" for one month', () => {
      const timestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('1 month ago');
    });

    it('returns "X months ago" for multiple months', () => {
      const timestamp = Date.now() - 90 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('3 months ago');
    });

    it('returns "1 year ago" for one year', () => {
      const timestamp = Date.now() - 365 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('1 year ago');
    });

    it('returns "X years ago" for multiple years', () => {
      const timestamp = Date.now() - 730 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(timestamp)).toBe('2 years ago');
    });
  });

  describe('formatTime', () => {
    it('formats a timestamp as a time string', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      const result = formatTime(timestamp);
      // The format depends on locale, but should contain the time
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDate', () => {
    it('formats a timestamp as a date string', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      const result = formatDate(timestamp);
      expect(result).toBe('Jan 15, 2024');
    });
  });

  describe('escapeHtml', () => {
    it('escapes ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('escapes less than signs', () => {
      expect(escapeHtml('foo < bar')).toBe('foo &lt; bar');
    });

    it('escapes greater than signs', () => {
      expect(escapeHtml('foo > bar')).toBe('foo &gt; bar');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('foo "bar"')).toBe('foo &quot;bar&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("foo 'bar'")).toBe('foo &#039;bar&#039;');
    });

    it('handles multiple special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('returns empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });
});
