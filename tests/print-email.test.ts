/**
 * In-page email print: only the email is mounted for printing, it's
 * isolated in a shadow root, unsafe content is stripped, and the mount is
 * cleaned up after printing.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mountEmailForPrint,
  printEmailHTML,
  cleanupPrintedEmail,
  PRINT_ROOT_ID,
} from '@/lib/print-email';

const EMAIL = `<!DOCTYPE html><html><head><style>.hdr{color:red}</style>
<script>window.__pwned = 1</script></head>
<body style="margin:0"><h1 class="hdr" onclick="alert(1)">SUMMER SALE</h1>
<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>
<iframe src="https://evil.example"></iframe><img src="data:image/png;base64,iVBORw0KGgo="></body></html>`;

afterEach(() => {
  cleanupPrintedEmail();
  vi.restoreAllMocks();
});

describe('mountEmailForPrint', () => {
  it('mounts the email in a shadow root under a single print host', () => {
    const shadow = mountEmailForPrint(EMAIL);
    expect(document.querySelectorAll(`#${PRINT_ROOT_ID}`)).toHaveLength(1);
    expect(shadow.textContent).toContain('SUMMER SALE');
    // Email styles live inside the shadow root, not the app document.
    expect(
      [...shadow.querySelectorAll('style')].some((s) =>
        s.textContent?.includes('.hdr')
      )
    ).toBe(true);
    expect(document.head.textContent).not.toContain('.hdr');
  });

  it('adds a print stylesheet that hides everything except the email', () => {
    mountEmailForPrint(EMAIL);
    const css = document.getElementById('talaria-print-style')!.textContent!;
    expect(css).toContain('@media print');
    expect(css).toContain(`body > *:not(#${PRINT_ROOT_ID})`);
  });

  it('strips scripts, frames, inline handlers and javascript: URLs', () => {
    const shadow = mountEmailForPrint(EMAIL);
    expect(shadow.querySelector('script, iframe')).toBeNull();
    expect(shadow.querySelector('[onclick]')).toBeNull();
    const hrefs = [...shadow.querySelectorAll('a')].map((a) =>
      a.getAttribute('href')
    );
    expect(hrefs).toEqual([null, 'https://example.com']);
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('keeps the email body inline style and images', () => {
    const shadow = mountEmailForPrint(EMAIL);
    const body = shadow.querySelector('[data-email-body]')!;
    expect(body.getAttribute('style')).toContain('margin:0');
    expect(shadow.querySelectorAll('img')).toHaveLength(1);
  });

  it('replaces a previous mount instead of stacking', () => {
    mountEmailForPrint(EMAIL);
    mountEmailForPrint(EMAIL);
    expect(document.querySelectorAll(`#${PRINT_ROOT_ID}`)).toHaveLength(1);
    expect(document.querySelectorAll('#talaria-print-style')).toHaveLength(1);
  });
});

describe('printEmailHTML', () => {
  it('calls the top-level window.print and cleans up after printing', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await printEmailHTML(EMAIL);
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.getElementById(PRINT_ROOT_ID)).not.toBeNull();
    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById(PRINT_ROOT_ID)).toBeNull();
    expect(document.getElementById('talaria-print-style')).toBeNull();
  });

  it('does nothing for empty HTML', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await printEmailHTML('');
    expect(print).not.toHaveBeenCalled();
  });
});
