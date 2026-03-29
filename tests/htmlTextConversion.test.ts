import { describe, it, expect } from 'vitest';
import {
  extractEditableContent,
  htmlToPlainText,
  getPlainTextFromPreview,
} from '../src/lib/htmlTextConversion';

describe('htmlTextConversion', () => {
  describe('htmlToPlainText', () => {
    it('converts simple HTML to plain text', () => {
      const result = htmlToPlainText('<p>Hello World</p>');
      expect(result).toContain('Hello World');
    });

    it('returns empty string for null/undefined', () => {
      expect(htmlToPlainText(null)).toBe('');
      expect(htmlToPlainText(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(htmlToPlainText('')).toBe('');
    });

    it('converts paragraphs to double newlines', () => {
      const result = htmlToPlainText('<p>First</p><p>Second</p>');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('\n\n');
    });

    it('converts br to newlines', () => {
      const result = htmlToPlainText('Line 1<br>Line 2');
      expect(result).toContain('Line 1\nLine 2');
    });

    it('converts list items to bullets', () => {
      const result = htmlToPlainText('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });

    it('extracts text from links', () => {
      const result = htmlToPlainText('<a href="#">Link text</a>');
      expect(result).toContain('Link text');
    });

    it('handles nested inline elements', () => {
      const result = htmlToPlainText('<strong>Bold</strong> and <em>italic</em>');
      expect(result).toContain('Bold');
      expect(result).toContain('italic');
    });
  });

  describe('extractEditableContent', () => {
    it('returns empty string for null input', () => {
      expect(extractEditableContent(null)).toBe('');
    });

    it('extracts content from element', () => {
      const el = document.createElement('div');
      el.innerHTML = '<p>Content</p>';
      const result = extractEditableContent(el);
      expect(result).toContain('Content');
    });

    it('excludes signature block', () => {
      const el = document.createElement('div');
      el.innerHTML =
        '<div class="email-body-editable"><p>Body</p></div><div class="email-signature-protected"><p>Sig</p></div>';
      const result = extractEditableContent(el);
      expect(result).toContain('Body');
      expect(result).not.toContain('Sig');
    });
  });

  describe('getPlainTextFromPreview', () => {
    it('returns plain text from preview element', () => {
      const el = document.createElement('div');
      el.innerHTML = '<p>Hello World</p>';
      const result = getPlainTextFromPreview(el);
      expect(result).toContain('Hello World');
    });

    it('returns empty string for null input', () => {
      expect(getPlainTextFromPreview(null)).toBe('');
    });
  });
});
