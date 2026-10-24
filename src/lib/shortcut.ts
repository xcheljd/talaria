import { detectOS } from '@/lib/ui-utils';

/**
 * Turn a TipTap-style shortcut ("Ctrl+Shift+7") into display keys for the
 * current OS. TipTap's `Mod` is Cmd on macOS and Ctrl elsewhere, so the
 * editor's shortcuts already behave this way; this only fixes the labels.
 *
 *   mac:   ["⌘", "⇧", "7"]
 *   other: ["Ctrl", "Shift", "7"]
 */
const MAC: Record<string, string> = {
  ctrl: '⌘',
  mod: '⌘',
  cmd: '⌘',
  shift: '⇧',
  alt: '⌥',
  option: '⌥',
};
const OTHER: Record<string, string> = {
  ctrl: 'Ctrl',
  mod: 'Ctrl',
  cmd: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Alt',
};

export function shortcutKeys(
  shortcut: string,
  os: ReturnType<typeof detectOS> = detectOS()
): string[] {
  const map = os === 'mac' ? MAC : OTHER;
  return shortcut
    .split('+')
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => map[k.toLowerCase()] ?? (k.length === 1 ? k.toUpperCase() : k));
}

/** Accessible text for the same shortcut ("Command Shift 7" / "Ctrl Shift 7"). */
export function shortcutLabel(
  shortcut: string,
  os: ReturnType<typeof detectOS> = detectOS()
): string {
  const spoken: Record<string, string> = {
    '⌘': 'Command',
    '⇧': 'Shift',
    '⌥': 'Option',
  };
  return shortcutKeys(shortcut, os)
    .map((k) => spoken[k] ?? k)
    .join(' ');
}
