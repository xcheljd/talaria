/**
 * Print regression: the print iframe must be sandboxed (no scripts) but
 * still allow modals, or print() is silently ignored in Chromium/WebView2
 * (broke Windows printing in v1.5.0).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  usePreviewActions,
  selectPreviewStore,
  PRINT_IFRAME_SANDBOX,
} from '@/components/promotion/usePreviewActions';
import { usePromotionStore } from '@/stores/promotion-store';

afterEach(() => {
  document.querySelectorAll('iframe').forEach((f) => f.remove());
  vi.restoreAllMocks();
});

describe('print iframe sandbox', () => {
  it('allows modals and same-origin but never scripts', () => {
    const tokens = PRINT_IFRAME_SANDBOX.split(/\s+/);
    expect(tokens).toContain('allow-modals');
    expect(tokens).toContain('allow-same-origin');
    expect(tokens).not.toContain('allow-scripts');
  });

  it('handlePrint writes only the email into a sandboxed iframe and prints it', () => {
    const print = vi.fn();
    const store = selectPreviewStore(usePromotionStore.getState());
    const { result } = renderHook(() =>
      usePreviewActions('<html><body><p>EMAIL ONLY</p></body></html>', store)
    );
    const spy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(function (this: HTMLElement, node: Node) {
        const out = Node.prototype.appendChild.call(this, node);
        if (node instanceof HTMLIFrameElement && node.contentWindow) {
          node.contentWindow.print = print;
        }
        return out as never;
      });
    result.current.handlePrint();
    const iframe = document.querySelector('iframe')!;
    expect(iframe.getAttribute('sandbox')).toBe(PRINT_IFRAME_SANDBOX);
    expect(iframe.contentDocument?.body.textContent).toContain('EMAIL ONLY');
    expect(print).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
