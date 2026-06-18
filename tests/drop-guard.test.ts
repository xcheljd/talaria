import { vi } from 'vitest';
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));
import { toast } from 'sonner';

import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { useGlobalDropGuard } from '@/hooks/useGlobalDropGuard';

function Harness() {
  useGlobalDropGuard();
  return null;
}

function fileDrop(type: 'drop' | 'dragover') {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', {
    value: { types: ['Files'] },
  });
  return ev as unknown as DragEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGlobalDropGuard', () => {
  it('prevents default on a file drop dispatched to window', () => {
    render(createElement(Harness));
    const ev = fileDrop('drop');
    window.dispatchEvent(ev);
    expect((ev as unknown as Event).defaultPrevented).toBe(true);
  });

  it('prevents default on a file dragover dispatched to window', () => {
    render(createElement(Harness));
    const ev = fileDrop('dragover');
    window.dispatchEvent(ev);
    expect((ev as unknown as Event).defaultPrevented).toBe(true);
  });

  it('does NOT prevent default when dataTransfer carries no files', () => {
    render(createElement(Harness));
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', {
      value: { types: ['text/plain'] },
    });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('does NOT prevent default after the component unmounts (listeners cleaned up)', () => {
    const { unmount } = render(createElement(Harness));
    unmount();
    const ev = fileDrop('drop');
    window.dispatchEvent(ev);
    expect((ev as unknown as Event).defaultPrevented).toBe(false);
  });

  it('shows a hint toast when a file is dropped outside any registered zone', () => {
    render(createElement(Harness));
    const ev = fileDrop('drop');
    window.dispatchEvent(ev);
    expect((ev as unknown as Event).defaultPrevented).toBe(true);
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(
      'To attach a PDF, drop it on the PDF Attachments area in the Promotion builder.',
      { id: 'drop-outside-zone' }
    );
  });

  it('does NOT show a toast when a drop zone already handled the drop (defaultPrevented)', () => {
    render(createElement(Harness));
    const ev = fileDrop('drop');
    // Simulate a real drop zone calling preventDefault before the event reaches the window guard
    (ev as unknown as Event).preventDefault();
    window.dispatchEvent(ev);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('does NOT show a toast for non-file drops', () => {
    render(createElement(Harness));
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', {
      value: { types: ['text/plain'] },
    });
    window.dispatchEvent(ev);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('does NOT show a toast after the component unmounts', () => {
    const { unmount } = render(createElement(Harness));
    unmount();
    const ev = fileDrop('drop');
    window.dispatchEvent(ev);
    expect((ev as unknown as Event).defaultPrevented).toBe(false);
    expect(toast.info).not.toHaveBeenCalled();
  });
});
