import { describe, it, expect } from 'vitest';
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
});
