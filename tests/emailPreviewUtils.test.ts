import { describe, it, expect } from 'vitest';
import {
  plainTextToPreviewHTML,
  wrapHtmlForEmailPreview,
} from '../src/lib/emailPreviewUtils';

describe('emailPreviewUtils', () => {
  describe('plainTextToPreviewHTML', () => {
    it('converts plain text to HTML paragraphs', () => {
      const result = plainTextToPreviewHTML('Hello World');
      expect(result).toContain('<p');
      expect(result).toContain('Hello World');
    });

    it('converts double newlines to paragraph breaks', () => {
      const result = plainTextToPreviewHTML('First\n\nSecond');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      // Two separate paragraph elements
      expect(result).toMatch(/<p[^>]*>.*?<\/p>\s*<p[^>]*>.*?<\/p>/s);
    });

    it('converts bullet list to ul/li', () => {
      const result = plainTextToPreviewHTML('• Item one\n• Item two');
      expect(result).toContain('<ul');
      expect(result).toContain('<li');
      expect(result).toContain('Item one');
      expect(result).toContain('Item two');
    });

    it('converts dash list to ul/li', () => {
      const result = plainTextToPreviewHTML('- Item one\n- Item two');
      expect(result).toContain('<ul');
      expect(result).toContain('<li');
    });

    it('preserves single line breaks as br', () => {
      const result = plainTextToPreviewHTML('Line 1\nLine 2');
      expect(result).toContain('<br>');
    });

    it('escapes HTML in content', () => {
      const result = plainTextToPreviewHTML('<script>alert(1)</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('uses black text color by default', () => {
      const result = plainTextToPreviewHTML('Hello');
      expect(result).toContain('rgb(0, 0, 0)');
    });
  });

  describe('wrapHtmlForEmailPreview', () => {
    it('wraps content in email template', () => {
      const result = wrapHtmlForEmailPreview('<p>Hello</p>');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('email-container');
      expect(result).toContain('email-header');
      expect(result).toContain('email-body');
    });

    it('uses default subject when none found', () => {
      const result = wrapHtmlForEmailPreview('<p>Body</p>');
      expect(result).toContain('Email Preview');
    });

    it('extracts subject from content', () => {
      const result = wrapHtmlForEmailPreview(
        'Subject: My Subject\n<p>Body</p>'
      );
      expect(result).toContain('My Subject');
    });

    it('extracts subject from originalMessage parameter', () => {
      const result = wrapHtmlForEmailPreview(
        '<p>Body</p>',
        'Subject: Original Subject\n<p>Body</p>'
      );
      expect(result).toContain('Original Subject');
    });

    it('escapes subject in title', () => {
      const result = wrapHtmlForEmailPreview(
        'Subject: <script>alert(1)</script>\n<p>Body</p>'
      );
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });
});
