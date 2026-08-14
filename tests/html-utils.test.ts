import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  escapeAttr,
  sanitizeTemplateData,
  sanitizeRichHTML,
} from '../src/lib/html-utils';

describe('html-utils', () => {
  describe('sanitizeHTML', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(sanitizeHTML('a & b')).toBe('a &amp; b');
    });

    it('escapes less-than and greater-than', () => {
      expect(sanitizeHTML('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('handles plain text without modification', () => {
      expect(sanitizeHTML('Hello World')).toBe('Hello World');
    });

    it('handles unicode characters', () => {
      expect(sanitizeHTML('Héllo Wörld 日本語')).toBe('Héllo Wörld 日本語');
    });

    it('escapes nested script tags', () => {
      const input = '<script><script>alert(1)</script></script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('escapeAttr', () => {
    it('escapes single quotes', () => {
      expect(escapeAttr("it's")).toBe("it&#39;s");
    });

    it('escapes double quotes', () => {
      expect(escapeAttr('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('escapes both quote types', () => {
      expect(escapeAttr(`it's "quoted"`)).toBe(`it&#39;s &quot;quoted&quot;`);
    });

    it('returns empty string for empty input', () => {
      expect(escapeAttr('')).toBe('');
    });

    it('handles plain text without quotes', () => {
      expect(escapeAttr('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeTemplateData', () => {
    it('sanitizes all string values in an object', () => {
      const data = {
        name: '<b>John</b>',
        phone: '555-1234',
        age: 25,
      };
      const result = sanitizeTemplateData(data);
      expect(result.name).toBe('&lt;b&gt;John&lt;/b&gt;');
      expect(result.phone).toBe('555-1234');
      expect(result.age).toBe(25);
    });

    it('preserves non-string values', () => {
      const data = { count: 42, active: true };
      const result = sanitizeTemplateData(data);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });

    it('handles empty object', () => {
      const result = sanitizeTemplateData({});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('sanitizeRichHTML img src validation', () => {
    it('strips javascript: img src', () => {
      const result = sanitizeRichHTML('<img src="javascript:alert(1)">');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('src=');
    });

    it('strips data:text/html img src', () => {
      const result = sanitizeRichHTML(
        '<img src="data:text/html,<script>alert(1)</script>">'
      );
      expect(result).not.toContain('data:text/html');
      expect(result).not.toContain('<script>');
    });

    it('strips other non-image data: payloads', () => {
      const result = sanitizeRichHTML(
        '<img src="data:application/pdf;base64,AAAA">'
      );
      expect(result).not.toContain('data:application');
    });

    it('keeps https img src', () => {
      const result = sanitizeRichHTML('<img src="https://example.com/a.png">');
      expect(result).toContain('src="https://example.com/a.png"');
    });

    it('keeps data:image/ img src', () => {
      const result = sanitizeRichHTML(
        '<img src="data:image/png;base64,iVBORw0KGgo=">'
      );
      expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    });

    it('keeps cid: img src', () => {
      const result = sanitizeRichHTML('<img src="cid:logo@example.com">');
      expect(result).toContain('src="cid:logo@example.com"');
    });

    it('keeps relative img src', () => {
      const result = sanitizeRichHTML('<img src="images/logo.png">');
      expect(result).toContain('src="images/logo.png"');
    });
  });
});
