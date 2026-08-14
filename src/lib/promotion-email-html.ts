/**
 * Promotion Email HTML Generation
 * Pure functions for generating the promotion email HTML from store data.
 * Migrated from src/js/promotion-ui.js generatePromotionEmailHTML()
 */

import { sanitizeHTML, sanitizeRichHTML, escapeAttr } from './html-utils';
import {
  getStorePhone,
  getStoreName,
  getStoreAddress,
  getStoreEmail,
  getStoreHours,
  getStorePlusCode,
} from './profile';
import {
  type PromotionEntry,
  type SpecialHour,
  type HowToShopItem,
  type ImportantNotesItem,
  type NewsletterPosition,
  type NewsletterStyle,
} from '@/stores/promotion-store';
import { generatePromoTitle } from './holiday-dates';
import { SAFE_COLOR_RE } from './promotion-config-schema';

// ===== Email Palette =====

/**
 * Canonical color palette for the promotion email template.
 * All email HTML generation references this palette so newsletter
 * "auto" colors and future theming derive from a single source of truth.
 */
export const EMAIL_PALETTE = {
  /** Footer & header accent background (#2c3e50 dark blue-gray) */
  footerBg: '#2c3e50',
  /** "How to Shop" box and general section background */
  sectionBg: '#f5f5f5',
  /** Unsubscribe row background */
  unsubscribeBg: '#f4f4f4',
  /** Gold accent for store hours & special hours */
  accent: '#ffd700',
  /** Primary body text */
  text: '#333333',
  /** Link color & callout text */
  link: '#0066cc',
  /** Important notes box border */
  noteBorder: '#ddd',
  /** Header separator border */
  headerBorder: 'gray',
  /** Body / table background */
  bodyBg: 'white',
  /** Footer text color */
  footerText: 'white',
} as const;

export type EmailPalette = {
  [K in keyof typeof EMAIL_PALETTE]: string;
};

// ===== Dark Mode Preview Transform =====
//
// The dark-mode toggle in the live preview emulates how real email clients
// render a (always-light) email in dark mode. The most aggressive clients —
// Outlook on Windows, the Gmail iOS app — perform a *full* inversion: they flip
// the lightness of every color (backgrounds, text, borders, and inline/custom
// colors alike) while keeping hue, so light surfaces go dark, dark text goes
// light, and brand colors stay recognizable. Because a lightness flip swaps a
// foreground and its background together, contrast is preserved by
// construction — there's no separate "readability" pass to keep in sync, and
// editor-chosen text/highlight colors are handled exactly like palette colors.
//
// We model this by inverting the lightness of every color found inside inline
// `style="…"` attributes of the generated HTML. Export output is never touched;
// this runs only for the preview's dark branch.

/** Parse a CSS color string to [r, g, b] (0-255). Handles hex and named colors. */
function parseColor(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();

  // Named colors
  const named: Record<string, [number, number, number]> = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    orange: [255, 165, 0],
  };
  if (named[c]) return named[c];

  // Hex: #rgb, #rrggbb
  const hex = c.replace('#', '');
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  return null;
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** Convert RGB (0-255) to HSL with h in [0,360) and s, l in [0,1]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l]; // achromatic (gray)
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

/** Convert HSL (h in [0,360), s, l in [0,1]) back to RGB (0-255). */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = (((h % 360) + 360) % 360) / 360;
  const channel = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(channel(hk + 1 / 3) * 255),
    Math.round(channel(hk) * 255),
    Math.round(channel(hk - 1 / 3) * 255),
  ];
}

/**
 * Lightness band for inverted colors. Flipping into [0.10, 0.90] rather than
 * the full [0, 1] keeps backgrounds off pure black (white → ~#1a1a1a, the tone
 * email clients themselves favor) and dark text off pure white, while leaving
 * mid-lightness brand colors essentially where they are.
 */
const DARK_L_MIN = 0.1;
const DARK_L_MAX = 0.9;

/** Invert a color's lightness, preserving hue and saturation. */
function invertLightness(
  rgb: [number, number, number]
): [number, number, number] {
  const [h, s, l] = rgbToHsl(...rgb);
  const nl = DARK_L_MIN + (1 - l) * (DARK_L_MAX - DARK_L_MIN);
  return hslToRgb(h, s, nl);
}

/**
 * Invert a single CSS color value for dark-mode preview. Handles hex (#rgb,
 * #rrggbb), the named colors the template emits, and rgb()/rgba(). Anything we
 * can't parse is returned unchanged — matching how a client leaves colors it
 * doesn't understand alone.
 */
export function invertColorForDarkMode(color: string): string {
  const rgbFn = color.trim().match(/^rgba?\(([^)]*)\)$/i);
  if (rgbFn) {
    const parts = rgbFn[1].split(',').map((p) => p.trim());
    const [r, g, b] = parts.map((p) => parseInt(p, 10));
    if ([r, g, b].every(Number.isFinite)) {
      const [nr, ng, nb] = invertLightness([r, g, b]);
      return parts.length >= 4
        ? `rgba(${nr}, ${ng}, ${nb}, ${parts[3]})`
        : `rgb(${nr}, ${ng}, ${nb})`;
    }
    return color;
  }
  const rgb = parseColor(color);
  return rgb ? toHex(...invertLightness(rgb)) : color;
}

/** Parse hex, named, or rgb()/rgba() to [r, g, b] (alpha dropped); null if unrecognized. */
function parseAnyColor(color: string): [number, number, number] | null {
  const rgbFn = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbFn) {
    const rgb = [rgbFn[1], rgbFn[2], rgbFn[3]].map((n) => parseInt(n, 10)) as [
      number,
      number,
      number,
    ];
    return rgb.every((n) => n >= 0 && n <= 255) ? rgb : null;
  }
  return parseColor(color);
}

/**
 * Dark-mode emulation model:
 *  - 'full':    flip the lightness of every color (Outlook Windows, Gmail iOS).
 *  - 'partial': only darken light *backgrounds* and lighten dark *foregrounds*
 *               (text/border), leaving already-dark backgrounds and already-light
 *               foregrounds alone (Gmail mobile, Outlook.com / Outlook mobile).
 */
export type DarkModeStyle = 'full' | 'partial';

/** A color is "light" once its HSL lightness clears the midpoint. */
const LIGHT_LEVEL = 0.5;

/** Background-bearing CSS properties (vs text/border foreground properties). */
function isBackgroundProp(prop: string): boolean {
  const p = prop.trim().toLowerCase();
  return (
    p === 'background' || p === 'background-color' || p === 'background-image'
  );
}

/** Invert one color value for the chosen model, given its background/foreground role. */
function invertColorForMode(
  color: string,
  isBackground: boolean,
  mode: DarkModeStyle
): string {
  if (mode === 'full') return invertColorForDarkMode(color);
  const rgb = parseAnyColor(color);
  if (!rgb) return color;
  const isLight = rgbToHsl(...rgb)[2] > LIGHT_LEVEL;
  // Partial inversion flips light backgrounds (→ dark) and dark foregrounds
  // (→ light); everything else is left as the client found it.
  const shouldFlip = isBackground ? isLight : !isLight;
  return shouldFlip ? invertColorForDarkMode(color) : color;
}

// Color values that can appear inside an inline style declaration: hex (6-digit
// listed first so it wins over a 3-digit prefix), rgb()/rgba(), and the named
// colors the generator can emit.
const COLOR_TOKEN_RE =
  /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]*\)|\b(?:white|black|gray|grey|red|green|blue|yellow|orange)\b/gi;
// One CSS declaration (`prop: value`) anchored at the start of the style value
// or after a `;`, so a `:` inside a url() value isn't mistaken for a property.
// The captured separators/whitespace/colon are preserved verbatim on output, so
// only color tokens within the value can change.
const DECL_RE = /(^|;)(\s*)([a-z-]+)(\s*:\s*)([^;]*)/gi;
const STYLE_ATTR_RE = /style="([^"]*)"/g;

/**
 * Emulate an email client's dark-mode inversion over already-generated (light)
 * email HTML: rewrite the colors inside inline style attributes — including
 * editor-chosen text and highlight colors — per the chosen model (see
 * DarkModeStyle). Role (background vs foreground) is read from each color's CSS
 * property so partial inversion can treat them differently. Pure — the input is
 * not mutated, and export output is never passed through here.
 */
/** Invert the colors inside a single inline-style declaration string. */
function invertStyleDeclarations(css: string, mode: DarkModeStyle): string {
  return css.replace(
    DECL_RE,
    (
      _decl,
      sep: string,
      ws: string,
      prop: string,
      colon: string,
      value: string
    ) => {
      const isBackground = isBackgroundProp(prop);
      const newValue = value.replace(COLOR_TOKEN_RE, (token) =>
        invertColorForMode(token, isBackground, mode)
      );
      return `${sep}${ws}${prop}${colon}${newValue}`;
    }
  );
}

export function applyDarkModePreview(
  html: string,
  mode: DarkModeStyle = 'full'
): string {
  return html.replace(
    STYLE_ATTR_RE,
    (_match, css: string) => `style="${invertStyleDeclarations(css, mode)}"`
  );
}

/** data-attribute that stashes an element's original (light) inline style. */
const LIGHT_STYLE_ATTR = 'data-pp-light-style';

/**
 * Apply (or revert) the dark-mode color inversion directly on a live preview
 * document's inline styles — the same transform as applyDarkModePreview, but
 * mutating the DOM in place so toggling modes never reloads the iframe (which
 * would reset its scroll position, most visibly in WebKit/WKWebView).
 *
 * The original light style of each element is stashed in a data-attribute the
 * first time it's inverted, so switching between models (or back to light)
 * always re-derives from the original rather than re-inverting an inverted
 * value. Safe to call repeatedly and idempotent for a given mode.
 */
export function applyDarkModeToDocument(
  doc: Document,
  mode: DarkModeStyle | 'light'
): void {
  doc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    const saved = el.getAttribute(LIGHT_STYLE_ATTR);
    // The element's original light style: the stash if present, else current.
    const lightStyle = saved ?? el.getAttribute('style') ?? '';

    if (mode === 'light') {
      if (saved !== null) {
        el.setAttribute('style', saved);
        el.removeAttribute(LIGHT_STYLE_ATTR);
      }
      return;
    }

    if (saved === null) el.setAttribute(LIGHT_STYLE_ATTR, lightStyle);
    el.setAttribute('style', invertStyleDeclarations(lightStyle, mode));
  });
}

// ===== Types =====

export interface PromotionEmailData {
  promoDateRange: string;
  promoYear: string;
  promoTitle: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  howToShopStyle?: {
    borderColor: string | null;
    backgroundColor: string | null;
  };
  importantNotesStyle?: {
    borderColor: string | null;
    backgroundColor: string | null;
  };
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterVisible: boolean;
  preheaderText?: string;
  newsletterStyle: {
    borderColor: string;
    backgroundColor: string;
    headingColor: string;
    borderStyle: 'left' | 'full' | 'none' | 'top';
    headingAlign: 'left' | 'center';
    tableBorderColor?: string;
    tableBorderWidth?: 1 | 2 | 3;
    tableBorderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
    tableHeaderBg?: string;
  };
  /** Optional custom email palette; falls back to EMAIL_PALETTE defaults */
  emailPalette?: EmailPalette;
}

export interface PromotionConfigForExport {
  templateType: 'promotion-email';
  version: number;
  dateRange: string;
  year: string;
  title: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  howToShopStyle?: {
    borderColor: string | null;
    backgroundColor: string | null;
  };
  importantNotesStyle?: {
    borderColor: string | null;
    backgroundColor: string | null;
  };
  attachedPDFs: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    /** base64 data URL — only present when the export embedded PDF files */
    data?: string;
  }>;
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
  preheaderText?: string;
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterStyle: NewsletterStyle;
  newsletterVisible: boolean;
  emailPalette?: EmailPalette;
  /** Raw bulk-email recipient text — only present when the export included it */
  bulkEmailRecipients?: string;
}

// ===== Helpers =====

/**
 * Convert TipTap HTML output to email-compatible inline-styled HTML.
 * Strips CSS classes, keeps only safe elements, and applies inline styles
 * for email client compatibility.
 *
 * Semantic formatting tags are converted to inline-styled spans:
 * - <strong> → <span style="font-weight: bold;">
 * - <em>     → <span style="font-style: italic;">
 * - <u>      → <span style="text-decoration: underline;">
 * - <mark>   → <span style="background-color: yellow;">
 *
 * Structural tags (h2, h3, p, ul, li, a) receive inline styles with
 * font-family, margins, and padding so no <style> block or CSS class
 * is needed in the email output.
 */
interface TableStyleOptions {
  borderColor: string;
  borderWidth: 1 | 2 | 3;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  headerBg: string;
}

const DEFAULT_TABLE_STYLE: TableStyleOptions = {
  borderColor: EMAIL_PALETTE.text,
  borderWidth: 1,
  borderStyle: 'solid',
  headerBg: EMAIL_PALETTE.sectionBg,
};

export function convertTipTapToInlineHTML(
  html: string,
  palette: EmailPalette = EMAIL_PALETTE,
  tableStyle: TableStyleOptions = DEFAULT_TABLE_STYLE
): string {
  if (!html || !html.trim()) return '';

  // Sanitize to strip dangerous elements (scripts, event handlers, etc.)
  // while preserving safe formatting tags
  const clean = sanitizeRichHTML(html);

  let result = clean;

  // ===== Semantic formatting → inline-styled spans =====
  // Note: these regexes operate on sanitizeRichHTML output (above), which
  // re-serializes the DOM with a known attribute order. The \b[^>]*
  // patterns tolerate attributes so a sanitizer change can't silently
  // leave tags unconverted.

  // <strong>/<b> → <span style="font-weight: bold;">
  result = result.replace(
    /<(?:strong|b)\b[^>]*>/g,
    '<span style="font-weight: bold;">'
  );
  result = result.replace(/<\/(?:strong|b)>/g, '</span>');

  // <em>/<i> → <span style="font-style: italic;">
  result = result.replace(
    /<(?:em|i)\b[^>]*>/g,
    '<span style="font-style: italic;">'
  );
  result = result.replace(/<\/(?:em|i)>/g, '</span>');

  // <u> → <span style="text-decoration: underline;">
  result = result.replace(
    /<u\b[^>]*>/g,
    '<span style="text-decoration: underline;">'
  );
  result = result.replace(/<\/u>/g, '</span>');

  // <s> → <span style="text-decoration: line-through;">
  result = result.replace(
    /<s\b[^>]*>/g,
    '<span style="text-decoration: line-through;">'
  );
  result = result.replace(/<\/s>/g, '</span>');

  // <mark> → <span style="background-color: yellow;">
  // Also handle marks with data-color attribute from TipTap highlight,
  // regardless of attribute order or additional attributes. The captured
  // color is validated against SAFE_COLOR_RE (no quotes, semicolons, or
  // angle brackets) before inlining so a malicious value can't inject
  // additional CSS declarations into the style attribute; invalid values
  // fall back to the default 'yellow'.
  result = result.replace(
    /<mark\b[^>]*\bdata-color="([^"]*)"[^>]*>/g,
    (_match, color: string) => {
      const safe = SAFE_COLOR_RE.test(color) ? color : 'yellow';
      return `<span style="background-color: ${safe};">`;
    }
  );
  result = result.replace(
    /<mark\b[^>]*>/g,
    '<span style="background-color: yellow;">'
  );
  result = result.replace(/<\/mark>/g, '</span>');

  // ===== Helper to extract text-align from existing style attr =====
  const extractTextAlign = (attrs: string | undefined): string => {
    const match = (attrs ?? '').match(
      /style="[^"]*text-align:\s*(left|center|right|justify)/
    );
    return match ? ` text-align: ${match[1]};` : '';
  };

  // ===== Structural elements with inline styles =====

  // Replace <h2> with inline-styled version (preserve text-align)
  result = result.replace(
    /<h2([^>]*)>/g,
    (_match, attrs) =>
      `<h2 style="font-size: 20px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 15px 0 8px 0; font-weight: bold;${extractTextAlign(attrs)}">`
  );

  // Replace <h3> with inline-styled version (preserve text-align)
  result = result.replace(
    /<h3([^>]*)>/g,
    (_match, attrs) =>
      `<h3 style="font-size: 17px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 12px 0 6px 0; font-weight: bold;${extractTextAlign(attrs)}">`
  );

  // Replace <p> with inline-styled version (preserve text-align).
  // NB: `(?:\s([^>]*))?` instead of `([^>]*)` so a bare `<p>` still
  // matches but `<pre>` does not — the old `[^>]*` captured `re` from
  // `<pre>` and rewrote code blocks as paragraphs before the pre/code
  // regex below could run, killing the code styling and leaking a
  // stray `</pre>`.
  result = result.replace(
    /<p(?:\s([^>]*))?>/g,
    (_match, attrs) =>
      `<p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 8px 0;${extractTextAlign(attrs)}">`
  );

  // Replace <ul> with inline-styled version
  result = result.replace(
    /<ul([^>]*)>/g,
    "<ul style=\"font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 8px 0; padding-left: 24px;\">"
  );

  // Replace <ol> with inline-styled version
  result = result.replace(
    /<ol([^>]*)>/g,
    "<ol style=\"font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 8px 0; padding-left: 24px;\">"
  );

  // Replace <li> with inline-styled version
  result = result.replace(
    /<li([^>]*)>/g,
    "<li style=\"font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 2px 0;\">"
  );

  // Replace <blockquote> with inline-styled version
  result = result.replace(
    /<blockquote([^>]*)>/g,
    `<blockquote style="border-left: 4px solid ${palette.accent}; padding-left: 12px; margin: 8px 0; color: #555555; font-style: italic;">`
  );

  // Replace <pre><code> blocks with inline-styled version
  result = result.replace(
    /<pre([^>]*)>\s*<code[^>]*>/g,
    `<pre style="background-color: ${palette.footerBg}; border-radius: 6px; padding: 12px 16px; margin: 8px 0; overflow-x: auto; border: 1px solid #dddddd;"><code style="font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5; background: none;">`
  );

  // Replace <hr> with inline-styled version (preserve existing style for dashed/dotted/accent variants)
  result = result.replace(/<hr([^>]*)>/g, (_match, attrs) => {
    const styleMatch = attrs.match(/style="([^"]*)"/);
    const existingStyle = styleMatch
      ? styleMatch[1]
      : `border: none; border-top: 1px solid ${tableStyle.borderColor};`;
    return `<hr style="margin: 12px 0; ${existingStyle}" />`;
  });

  // Replace <table> with inline-styled version
  const tBorder =
    tableStyle.borderStyle === 'none'
      ? 'border: none;'
      : `border: ${tableStyle.borderWidth}px ${tableStyle.borderStyle} ${tableStyle.borderColor};`;
  result = result.replace(
    /<table([^>]*)>/g,
    `<table style="border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; ${tBorder}">`
  );

  // Replace <td> with inline-styled version (preserve colspan/rowspan)
  const cellBorder =
    tableStyle.borderStyle === 'none'
      ? 'border: none;'
      : `border: ${tableStyle.borderWidth}px ${tableStyle.borderStyle} ${tableStyle.borderColor};`;
  result = result.replace(/<td([^>]*)>/g, (_match, attrs) => {
    const colspan = attrs.match(/colspan="([^"]*)"/);
    const rowspan = attrs.match(/rowspan="([^"]*)"/);
    let extra = '';
    if (colspan) extra += ` colspan="${colspan[1]}"`;
    if (rowspan) extra += ` rowspan="${rowspan[1]}"`;
    return `<td${extra} style="${cellBorder} padding: 6px 8px; vertical-align: top;">`;
  });

  // Replace <th> with inline-styled version (preserve colspan/rowspan)
  result = result.replace(/<th([^>]*)>/g, (_match, attrs) => {
    const colspan = attrs.match(/colspan="([^"]*)"/);
    const rowspan = attrs.match(/rowspan="([^"]*)"/);
    let extra = '';
    if (colspan) extra += ` colspan="${colspan[1]}"`;
    if (rowspan) extra += ` rowspan="${rowspan[1]}"`;
    return `<th${extra} style="${cellBorder} padding: 6px 8px; vertical-align: top; font-weight: bold; background-color: ${tableStyle.headerBg};">`;
  });

  // Replace <img> with inline-styled version (preserve src, alt, width, height, align, href)
  result = result.replace(/<img([^>]*)>/g, (_match, attrs) => {
    const src = attrs.match(/src="([^"]*)"/);
    const alt = attrs.match(/alt="([^"]*)"/);
    const width = attrs.match(/width="([^"]*)"/);
    const height = attrs.match(/height="([^"]*)"/);
    const alignMatch = attrs.match(/align="([^"]*)"/);
    const hrefMatch = attrs.match(/href="([^"]*)"/);
    if (!src) return '';

    const align = alignMatch?.[1] || 'center';
    let alignStyle = 'display: block; margin: 8px auto;';
    if (align === 'left')
      alignStyle = 'display: block; margin: 8px auto 8px 0;';
    if (align === 'right')
      alignStyle = 'display: block; margin: 8px 0 8px auto;';

    let imgAttrs = `src="${src[1]}"`;
    if (alt) imgAttrs += ` alt="${alt[1]}"`;
    if (width) imgAttrs += ` width="${width[1]}"`;
    if (height) imgAttrs += ` height="${height[1]}"`;
    const widthStyle = width ? `width: ${width[1]}px; ` : '';

    const imgTag = `<img ${imgAttrs} style="${widthStyle}max-width: 100%; height: auto; ${alignStyle}" />`;

    if (hrefMatch?.[1]) {
      return `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">${imgTag}</a>`;
    }
    return imgTag;
  });

  // Replace <a> with inline-styled version (preserve href regardless of
  // attribute order, and merge any existing style attribute so we don't
  // emit a duplicate `style=` on the tag).
  result = result.replace(/<a\b([^>]*)>/g, (match, attrs: string) => {
    const hrefMatch = attrs.match(/\bhref="([^"]*)"/);
    if (!hrefMatch) return match; // anchor without href — leave as-is
    const href = hrefMatch[1];
    const rest = attrs.replace(hrefMatch[0], '').replace(/^\s+/, ' ');
    const styleMatch = rest.match(/\s*style="([^"]*)"/);
    const linkStyle = `color: ${palette.link}; text-decoration: underline;`;
    if (styleMatch) {
      const restWithoutStyle = rest.replace(styleMatch[0], '');
      const existing = styleMatch[1].trim().replace(/;\s*$/, '');
      const merged = existing ? `${existing}; ${linkStyle}` : linkStyle;
      return `<a href="${href}"${restWithoutStyle} style="${merged}">`;
    }
    return `<a href="${href}"${rest} style="${linkStyle}">`;
  });

  // Strip javascript: URIs from links for safety
  result = result.replace(/href="javascript:[^"]*"/gi, 'href="#"');

  return result;
}

/**
 * Build the newsletter HTML section for email rendering.
 * Extracts the first H2 element from the body as the heading,
 * then renders the remaining body content.
 * Returns empty string if body is empty.
 */
function buildNewsletterSection(
  body: string,
  style: PromotionEmailData['newsletterStyle'],
  palette: EmailPalette = EMAIL_PALETTE
): string {
  if (!body || !body.trim()) return '';

  // Extract first H2 as heading
  const h2Match = body.match(/<h2[^>]*>(.*?)<\/h2>/i);
  const headingText = h2Match ? h2Match[1].replace(/<[^>]*>/g, '').trim() : '';
  const restBody = h2Match ? body.replace(/<h2[^>]*>.*?<\/h2>/i, '') : body;

  const tableOpts: TableStyleOptions = {
    borderColor: style.tableBorderColor ?? palette.text,
    borderWidth: style.tableBorderWidth ?? 1,
    borderStyle: style.tableBorderStyle ?? 'solid',
    headerBg: style.tableHeaderBg ?? palette.sectionBg,
  };
  const bodyHTML = convertTipTapToInlineHTML(restBody, palette, tableOpts);
  if (!headingText && (!bodyHTML || !bodyHTML.trim())) return '';

  // Check if the converted body is just empty tags (no visible content)
  const strippedBody = bodyHTML ? bodyHTML.replace(/<[^>]*>/g, '').trim() : '';
  if (!headingText && !strippedBody) return '';

  const headingDisplay =
    headingText && headingText.trim()
      ? sanitizeHTML(headingText)
      : 'Newsletter';

  // Build border style based on borderStyle option
  let borderCSS = '';
  switch (style.borderStyle) {
    case 'left':
      borderCSS = `border-left: 4px solid ${style.borderColor};`;
      break;
    case 'full':
      borderCSS = `border: 1px solid ${style.borderColor};`;
      break;
    case 'top':
      borderCSS = `border-top: 4px solid ${style.borderColor};`;
      break;
    case 'none':
      borderCSS = '';
      break;
  }

  // Build heading alignment
  const headingAlign = `text-align: ${style.headingAlign};`;

  return `
                <!-- NEWSLETTER -->
                <div style="background-color: ${style.backgroundColor}; padding: 15px; margin-bottom: 20px; ${borderCSS}">
                    <h2 style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0; color: ${style.headingColor}; ${headingAlign}">${headingDisplay}</h2>
                    ${bodyHTML}
                </div>`;
}

/** Apply formatting (bold/italic/underline) to item text */
function formatItemText(item: {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}): string {
  let text = sanitizeHTML(item.text);
  if (item.bold) text = `<strong>${text}</strong>`;
  if (item.italic) text = `<em>${text}</em>`;
  if (item.underline) text = `<u>${text}</u>`;
  return text;
}

// ===== Main Generation Function =====

/**
 * Generate the complete HTML for a promotion email.
 *
 * This is a pure function that takes promotion data and returns
 * an HTML string suitable for email preview and EML export.
 */
export function generatePromotionEmailHTML(data: PromotionEmailData): string {
  // Merge custom palette with defaults
  const pal: EmailPalette = data.emailPalette
    ? { ...EMAIL_PALETTE, ...data.emailPalette }
    : EMAIL_PALETTE;

  const dateRangeRaw = data.promoDateRange || '';
  const dateRange = sanitizeHTML(dateRangeRaw);
  const title =
    data.promoTitle && data.promoTitle.trim()
      ? sanitizeHTML(data.promoTitle)
      : generatePromoTitle(dateRangeRaw);

  const year =
    data.promoYear && data.promoYear.trim()
      ? sanitizeHTML(data.promoYear.trim())
      : new Date().getFullYear().toString();

  const storePhoneRaw = getStorePhone();
  const storePhone = sanitizeHTML(storePhoneRaw);
  // Normalize to a US tel: href; tolerate numbers already entered with a
  // leading country code so we don't emit tel:+11702...
  let phoneDigits = storePhoneRaw.replace(/\D/g, '');
  if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
    phoneDigits = phoneDigits.slice(1);
  }

  // Build brand sections from entries
  let brandSections = '';
  for (const entry of data.promotionEntries) {
    // Backwards compatibility: map old brand/discount fields
    // Use unknown intermediate cast for compatibility with strict type checking
    const entryAny = entry as unknown as Record<string, unknown>;
    if (!entry.line && (entryAny.brand || entryAny.discount)) {
      const brand = (entryAny.brand as string) || '';
      const discountText = entryAny.discount
        ? `${String(entryAny.discount).trim()}% OFF`
        : '';
      const pieces = [brand, discountText].filter((p) => p && p.trim());
      if (pieces.length > 0) {
        const _line = pieces.join(' – ');
        brandSections += buildEntryHTML(
          _line,
          entry.collections,
          entry.callout,
          pal
        );
      }
      continue;
    }

    if (!entry.line || !entry.line.trim()) continue;

    brandSections += buildEntryHTML(
      entry.line,
      entry.collections,
      entry.callout,
      pal
    );
  }

  // Store info
  const storeNameFooter = sanitizeHTML(getStoreName().toUpperCase());
  const rawAddress = getStoreAddress();
  const storeAddress = sanitizeHTML(rawAddress).replace(/\n/g, '<br>');
  const storeEmailRaw = getStoreEmail();
  const storeEmail = sanitizeHTML(storeEmailRaw);
  const storeHours = sanitizeHTML(getStoreHours());
  const plusCode = getStorePlusCode();

  let storeMapLink = 'https://www.google.com/maps';
  if (plusCode && plusCode.trim()) {
    storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(plusCode)}`;
  } else {
    const addressForSearch = getStoreAddress()
      .replace(/<br>/g, ' ')
      .replace(/\n/g, ' ');
    if (addressForSearch.trim()) {
      storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(addressForSearch)}`;
    }
  }

  // How to Shop section
  const howToShopHTML = data.howToShopItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  // Important Notes section
  const importantNotesHTML = data.importantNotesItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  // Special Hours section
  const specialHoursHTML =
    data.specialHours.length > 0
      ? `
                <p style="color: ${pal.accent}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${data.specialHours
                      .map((hour) =>
                        hour.day && hour.hours
                          ? `${sanitizeHTML(hour.day)}: ${sanitizeHTML(hour.hours)}`
                          : ''
                      )
                      .filter((h) => h)
                      .join('<br>')}
                </p>`
      : '';

  // Newsletter section (only rendered when visible and body has content)
  const newsletterVisible = data.newsletterVisible ?? false;

  const newsletterStyle = data.newsletterStyle || {
    borderColor: pal.footerBg,
    backgroundColor: pal.sectionBg,
    headingColor: pal.footerBg,
    borderStyle: 'left' as const,
    headingAlign: 'left' as const,
  };

  const newsletterSection = newsletterVisible
    ? buildNewsletterSection(data.newsletterBody, newsletterStyle, pal)
    : '';

  // Newsletter at top position: between HEADER and BRAND SECTIONS
  const newsletterTopHTML =
    data.newsletterPosition === 'top' ? newsletterSection : '';

  // Newsletter at bottom position: between BRAND SECTIONS and HOW TO SHOP BOX
  const newsletterBottomHTML =
    data.newsletterPosition === 'bottom' ? newsletterSection : '';

  // Resolve How to Shop box styles
  const htsStyle = data.howToShopStyle;
  const htsBg = htsStyle?.backgroundColor ?? pal.sectionBg;
  const htsBorder = htsStyle?.borderColor;
  const htsStyleAttr = [
    `background-color: ${htsBg}`,
    htsBorder ? `border: 1px solid ${htsBorder}` : '',
    `color: ${pal.text}`,
    'padding: 15px',
    'margin-bottom: 20px',
  ]
    .filter(Boolean)
    .join('; ');

  // Resolve Important Notes box styles
  const inStyle = data.importantNotesStyle;
  const inBorder = inStyle?.borderColor ?? pal.noteBorder;
  const inBg = inStyle?.backgroundColor;
  const inStyleAttr = [
    `border: 1px solid ${inBorder}`,
    inBg ? `background-color: ${inBg}` : '',
    `color: ${pal.text}`,
    'padding: 15px',
  ]
    .filter(Boolean)
    .join('; ');

  // Preheader text — hidden span that email clients show as preview text
  const preheaderHTML = data.preheaderText?.trim()
    ? `<span style="display:none;font-size:1px;color:${pal.bodyBg};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${sanitizeHTML(data.preheaderText.trim())}</span>`
    : '';

  const headTitle = sanitizeHTML(data.promoTitle?.trim() || 'Promotion');

  return `<!DOCTYPE html>
<html>
<head>
    <title>${headTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 480px) {
        .email-container { width: 100% !important; }
        .email-header { padding: 15px 12px !important; }
        .email-header h1 { font-size: 20px !important; }
        .email-body { padding: 15px 12px !important; }
        .email-body p { font-size: 13px !important; }
        .email-body .brand-line { font-size: 16px !important; }
        .email-footer { padding: 15px 12px !important; }
        .email-footer h3 { font-size: 16px !important; }
        .email-footer p { font-size: 12px !important; }
        .email-unsub { padding: 12px 10px !important; }
        .email-unsub p { font-size: 11px !important; }
        .section-box { padding: 12px !important; }
      }
    </style>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: ${pal.text}; background-color: ${pal.bodyBg}; margin: 0; padding: 0;">
${preheaderHTML}
    <center>
    <table class="email-container" width="600" style="max-width: 600px; width: 100%; background-color: ${pal.bodyBg}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;">

        <!-- HEADER -->
        <tr>
            <td class="email-header" style="padding: 20px; text-align: center; border-bottom: 2px solid ${pal.headerBorder};">
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${title}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${dateRange}, ${year} • While Supplies Last</p>
            </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
            <td class="email-body" style="padding: 25px;">
${newsletterTopHTML}
                <!-- BRAND SECTIONS -->
${brandSections}
${newsletterBottomHTML}

                <!-- HOW TO SHOP BOX -->
                <div class="section-box" style="${htsStyleAttr}">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${howToShopHTML}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div class="section-box" style="${inStyleAttr}">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${importantNotesHTML}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td class="email-footer" style="background-color: ${pal.footerBg}; padding: 20px; text-align: center;">
                <h3 style="color: ${pal.footerText}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">${storeNameFooter}</h3>
                <p style="color: ${pal.footerText}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${storeMapLink}" target="_blank" style="color: ${pal.footerText};">
                    ${storeAddress}</a>
                </p>
                <p style="color: ${pal.footerText}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${phoneDigits}" target="_blank" style="color: ${pal.footerText};">${storePhone}</a> |
                    📧 <a href="mailto:${escapeAttr(storeEmailRaw)}" target="_blank" style="color: ${pal.footerText};">${storeEmail}</a>
                </p>
                <p style="color: ${pal.accent}; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${storeHours}
                </p>${specialHoursHTML}
            </td>
        </tr>

        <!-- UNSUBSCRIBE -->
        <tr>
            <td class="email-unsub" style="background-color: ${pal.unsubscribeBg}; padding: 15px; text-align: center;">
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; color: ${pal.text}; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`;
}

// ===== Entry HTML Builder =====

function buildEntryHTML(
  line: string,
  collections: string,
  callout: string,
  palette: EmailPalette = EMAIL_PALETTE
): string {
  let html = `
                <p class="brand-line" style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${sanitizeHTML(line)}</b></p>`;

  if (collections && collections.trim()) {
    const collectionItems = collections
      .split(',')
      .map((c) => sanitizeHTML(c.trim()))
      .filter((c) => c);
    const collectionsHTML = collectionItems.map((c) => `*${c}`).join(' • ');

    html += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${callout && callout.trim() ? '5px' : '20px'};">
                    ${collectionsHTML}
                </p>`;
  }

  if (callout && callout.trim()) {
    html += `
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: ${palette.link}; font-style: italic;">
                    ${sanitizeHTML(callout)}
                </p>`;
  }

  return html;
}
