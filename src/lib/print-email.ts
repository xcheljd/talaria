/**
 * Print only the generated email, from the app's own page.
 *
 * Why not an iframe: WKWebView (macOS, and likely WebKitGTK on Linux)
 * silently ignores `iframe.contentWindow.print()` inside Tauri
 * (tauri-apps/tauri#13451), while top-level `window.print()` works on every
 * platform. So the email is mounted into the page itself:
 *
 * - inside a Shadow DOM root, so the email's styles and the app's styles
 *   can't leak into each other;
 * - behind a print-only stylesheet that hides the whole app, so the printout
 *   (and the print preview) contains just the email;
 * - with scripts, embedded frames and inline event handlers stripped first.
 *   The desktop CSP (`script-src 'self'`) would block them anyway; stripping
 *   keeps the web build equally safe.
 *
 * The mount is hidden on screen, replaced on the next print, and removed
 * after printing.
 */

export const PRINT_ROOT_ID = 'talaria-print-root';
const PRINT_STYLE_ID = 'talaria-print-style';

const PRINT_PAGE_CSS = `
#${PRINT_ROOT_ID} { display: none; }
@media print {
  html, body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
  #${PRINT_ROOT_ID} { display: block !important; }
}
`;

const BLOCKED_ELEMENTS = 'script, iframe, frame, object, embed, base, meta';

/** Parse the email document and return its styles + sanitized body. */
function extractEmail(html: string): {
  styles: string[];
  bodyHTML: string;
  bodyStyle: string;
} {
  // DOMParser documents never execute scripts or load subresources.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(BLOCKED_ELEMENTS).forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if (
        (name === 'href' || name === 'src') &&
        value.startsWith('javascript:')
      )
        el.removeAttribute(attr.name);
    }
  });
  const styles = [...doc.querySelectorAll('style')].map(
    (s) => s.textContent ?? ''
  );
  doc.body.querySelectorAll('style').forEach((s) => s.remove());
  return {
    styles,
    bodyHTML: doc.body.innerHTML,
    bodyStyle: doc.body.getAttribute('style') ?? '',
  };
}

/** Remove any print mount and print stylesheet left from a previous print. */
export function cleanupPrintedEmail(doc: Document = document): void {
  doc.getElementById(PRINT_ROOT_ID)?.remove();
  doc.getElementById(PRINT_STYLE_ID)?.remove();
}

/** Mount the email for printing. Returns the shadow root (for tests). */
export function mountEmailForPrint(
  html: string,
  doc: Document = document
): ShadowRoot {
  cleanupPrintedEmail(doc);

  const pageStyle = doc.createElement('style');
  pageStyle.id = PRINT_STYLE_ID;
  pageStyle.textContent = PRINT_PAGE_CSS;
  doc.head.appendChild(pageStyle);

  const host = doc.createElement('div');
  host.id = PRINT_ROOT_ID;
  doc.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const { styles, bodyHTML, bodyStyle } = extractEmail(html);
  // Reset everything the app would otherwise pass down (font, color, dark
  // theme), so the email prints exactly as its own HTML/CSS describes.
  const reset = doc.createElement('style');
  reset.textContent =
    ':host { all: initial; display: block; color: #000; background: #fff; }';
  shadow.appendChild(reset);
  for (const css of styles) {
    const s = doc.createElement('style');
    s.textContent = css;
    shadow.appendChild(s);
  }
  const body = doc.createElement('div');
  body.setAttribute('data-email-body', '');
  body.setAttribute('style', bodyStyle);
  // Safe: bodyHTML is the app-generated email (user fields already escaped
  // by sanitizeHTML), re-parsed above with scripts/frames/on* handlers and
  // javascript: URLs removed. innerHTML never runs <script>, and the desktop
  // CSP (script-src 'self') blocks inline handlers as a second layer.
  body.innerHTML = bodyHTML;
  shadow.appendChild(body);
  return shadow;
}

/** Wait (briefly) for the email's images to decode so they print. */
async function waitForImages(root: ShadowRoot, timeoutMs = 2000) {
  const imgs = [...root.querySelectorAll('img')];
  if (imgs.length === 0) return;
  await Promise.race([
    Promise.allSettled(
      imgs.map((img) =>
        typeof img.decode === 'function' ? img.decode() : Promise.resolve()
      )
    ),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

/**
 * Print just the email: mount it, open the native print dialog via the
 * top-level `window.print()`, then clean up when printing finishes.
 */
export async function printEmailHTML(
  html: string,
  win: Window = window
): Promise<void> {
  if (!html) return;
  const doc = win.document;
  const shadow = mountEmailForPrint(html, doc);
  await waitForImages(shadow);

  // afterprint fires once the dialog closes on every engine (print() is
  // blocking in Chromium, async in WebKit). If it never fires, the hidden
  // mount is harmless and the next print replaces it.
  win.addEventListener('afterprint', () => cleanupPrintedEmail(doc), {
    once: true,
  });
  win.print();
}
