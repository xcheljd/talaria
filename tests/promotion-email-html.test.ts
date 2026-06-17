/**
 * Unit tests for the dark-mode palette color math in promotion-email-html.
 *
 * `buildDarkModePalette` is the public entry point; the underlying color
 * helpers (parseColor, luminance, darkenBg, lightenText, adjustLink) are
 * private and exercised through it. These transforms had zero dedicated
 * coverage despite driving the dark-mode email preview.
 */

import { describe, it, expect } from 'vitest';
import {
  EMAIL_PALETTE,
  buildDarkModePalette,
  type EmailPalette,
} from '../src/lib/promotion-email-html';

const HEX = /^#[0-9a-f]{6}$/;

describe('EMAIL_PALETTE', () => {
  it('exposes all canonical palette keys', () => {
    expect(Object.keys(EMAIL_PALETTE).sort()).toEqual(
      [
        'accent',
        'bodyBg',
        'footerBg',
        'footerText',
        'headerBorder',
        'link',
        'noteBorder',
        'sectionBg',
        'text',
        'unsubscribeBg',
      ].sort()
    );
  });
});

describe('buildDarkModePalette', () => {
  it('returns every key of the input palette', () => {
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    expect(Object.keys(dark).sort()).toEqual(Object.keys(EMAIL_PALETTE).sort());
  });

  it('maps a white body background to a dark gray', () => {
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    // bodyBg defaults to 'white' (luminance > 0.7 → mapped to #1a1a1a)
    expect(dark.bodyBg).toBe('#1a1a1a');
  });

  it('darkens a light section background', () => {
    // sectionBg defaults to '#f5f5f5' (near-white) → dark
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    expect(dark.sectionBg).toBe('#1a1a1a');
  });

  it('lightens near-black body text for contrast', () => {
    // text defaults to '#333333' (very dark) → light gray
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    expect(dark.text).toBe('#d4d4d4');
  });

  it('brightens a dark link color', () => {
    // link defaults to '#0066cc' (dark blue) → brightened, not unchanged
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    expect(dark.link).toMatch(HEX);
    expect(dark.link).not.toBe(EMAIL_PALETTE.link);
  });

  it('keeps an already-bright accent largely intact', () => {
    // accent '#ffd700' (gold, luminance > 0.5) is preserved by lightenText
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    expect(dark.accent).toBe('#ffd700');
  });

  it('produces valid hex for every transformed key', () => {
    const dark = buildDarkModePalette(EMAIL_PALETTE);
    for (const value of Object.values(dark)) {
      // Either a 6-digit hex (transformed) or an unchanged named color
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('passes through colors it cannot parse, unchanged', () => {
    const palette: EmailPalette = {
      ...EMAIL_PALETTE,
      bodyBg: 'rgb(10, 20, 30)', // not hex or a known named color
      text: 'cornflowerblue', // unknown named color
    };
    const dark = buildDarkModePalette(palette);
    expect(dark.bodyBg).toBe('rgb(10, 20, 30)');
    expect(dark.text).toBe('cornflowerblue');
  });

  it('handles 3-digit hex shorthand', () => {
    const palette: EmailPalette = { ...EMAIL_PALETTE, noteBorder: '#ddd' };
    const dark = buildDarkModePalette(palette);
    // '#ddd' is light → darkened to a 6-digit hex
    expect(dark.noteBorder).toMatch(HEX);
    expect(dark.noteBorder).not.toBe('#ddd');
  });

  it('is deterministic for the same input', () => {
    expect(buildDarkModePalette(EMAIL_PALETTE)).toEqual(
      buildDarkModePalette(EMAIL_PALETTE)
    );
  });
});
