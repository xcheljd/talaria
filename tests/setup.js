import { vi } from 'vitest';
// Registers jest-dom matchers (toBeInTheDocument, etc.) on vitest's expect
// once, instead of per-file `expect.extend` calls. Types come from
// tests/jest-dom.d.ts.
import '@testing-library/jest-dom/vitest';

// jsdom does not implement layout APIs (getClientRects / getBoundingClientRect)
// on Range or text nodes. Tiptap/ProseMirror calls these inside
// scrollToSelection after edits; without these shims the tests still pass
// (the assertion fires before scrollToSelection) but vitest catches the
// thrown TypeError as an unhandled rejection and prints a noisy stack.
const emptyDomRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => ({}),
};
const emptyDomRectList = Object.assign([], {
  item: () => null,
});

if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects = () => emptyDomRectList;
  Range.prototype.getBoundingClientRect = () => emptyDomRect;
}
if (typeof Element !== 'undefined' && !Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => emptyDomRectList;
}

// jsdom does not implement window.matchMedia. Stub it to a no-op that always
// reports "no match" so helpers like prefersReducedMotion() don't throw.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      return Object.keys(store)[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

beforeEach(() => {
  localStorageMock.clear();
});
