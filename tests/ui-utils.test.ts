import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prefersReducedMotion,
  getScrollBehavior,
  detectOS,
  getRecommendedFormat,
} from '../src/lib/ui-utils';

// Mock window.matchMedia for jsdom
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ui-utils', () => {
  describe('prefersReducedMotion', () => {
    it('returns a boolean', () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getScrollBehavior', () => {
    it('returns smooth or auto', () => {
      const result = getScrollBehavior();
      expect(['smooth', 'auto']).toContain(result);
    });
  });

  describe('detectOS', () => {
    it('returns a valid OS string', () => {
      const result = detectOS();
      expect(['windows', 'mac', 'other']).toContain(result);
    });
  });

  describe('getRecommendedFormat', () => {
    it('returns eml or emltpl', () => {
      const result = getRecommendedFormat();
      expect(['eml', 'emltpl']).toContain(result);
    });

    it('returns emltpl on mac', () => {
      // Mock navigator.platform for mac detection
      const originalPlatform = navigator.platform;
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      expect(getRecommendedFormat()).toBe('emltpl');
      Object.defineProperty(navigator, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('returns eml on windows', () => {
      const originalPlatform = navigator.platform;
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
      expect(getRecommendedFormat()).toBe('eml');
      Object.defineProperty(navigator, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });
});
