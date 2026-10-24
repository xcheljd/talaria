import { describe, it, expect } from 'vitest';
import { shortcutKeys, shortcutLabel } from '@/lib/shortcut';

describe('shortcutKeys', () => {
  it('uses Mac symbols on macOS', () => {
    expect(shortcutKeys('Ctrl+Shift+7', 'mac')).toEqual(['⌘', '⇧', '7']);
    expect(shortcutKeys('Ctrl+Alt+2', 'mac')).toEqual(['⌘', '⌥', '2']);
    expect(shortcutKeys('Ctrl+b', 'mac')).toEqual(['⌘', 'B']);
  });
  it('keeps words elsewhere', () => {
    expect(shortcutKeys('Ctrl+Shift+7', 'windows')).toEqual([
      'Ctrl',
      'Shift',
      '7',
    ]);
    expect(shortcutKeys('Mod+Alt+C', 'other')).toEqual(['Ctrl', 'Alt', 'C']);
  });
  it('speaks symbols for screen readers', () => {
    expect(shortcutLabel('Ctrl+Shift+Z', 'mac')).toBe('Command Shift Z');
    expect(shortcutLabel('Ctrl+Shift+Z', 'windows')).toBe('Ctrl Shift Z');
  });
});
