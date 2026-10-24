/** Newsletter footer guidance + starter templates. */
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from '@/components/promotion/ResizableImage';
import { measureNewsletter } from '@/components/promotion/newsletter/NewsletterHealth';
import { NEWSLETTER_TEMPLATES } from '@/lib/newsletter-templates';

const make = (content: string) =>
  new Editor({ extensions: [StarterKit, ResizableImage], content });

describe('measureNewsletter', () => {
  it('estimates phone screens from words and images', () => {
    const short = measureNewsletter(make('<p>Short note.</p>'));
    expect(short.screens).toBe(0.5);
    const long = measureNewsletter(make(`<p>${'word '.repeat(360)}</p>`));
    expect(long.words).toBe(360);
    expect(long.screens).toBe(3);
    expect(long.readMinutes).toBe(2);
  });

  it('finds images without alt text and links without an address', () => {
    const r = measureNewsletter(
      make(
        '<p><a href="#">one</a> <a href="https://">two</a> <a href="https://ok.example">fine</a></p>' +
          '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Watch">'
      )
    );
    expect(r.emptyLinks).toHaveLength(2);
    expect(r.missingAlt).toHaveLength(1);
  });
});

describe('newsletter templates', () => {
  it('ships the four approved starting points with brackets to replace', () => {
    expect(NEWSLETTER_TEMPLATES.map((t) => t.name)).toEqual([
      'Store update',
      'Event / trunk show',
      'Holiday hours & shipping',
      'New arrivals',
    ]);
    for (const t of NEWSLETTER_TEMPLATES) {
      expect(t.heading).toBeTruthy();
      expect(t.body).toMatch(/\[[^\]]+\]/);
    }
  });
});
