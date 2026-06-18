/**
 * Unit tests for saveBlob() in src/lib/file-save.ts.
 *
 * saveBlob() is the single chokepoint through which every download in the app
 * passes (EML, HTML, PDF, bulk BCC batches).  It has two branches:
 *   - Browser branch: anchor-click download via URL.createObjectURL
 *   - Tauri branch: invoke('save_file_to_dir', { filename, dataBase64 })
 *
 * Each branch is tested in isolation by controlling the isTauri() mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @tauri-apps/api/core BEFORE importing the module under test so the
// factory runs first.  Mirrors the pattern used in bulk-email-generation.test.ts.
const isTauri = vi.fn();
const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => isTauri(),
  invoke: (...args: unknown[]) => invoke(...args),
}));

import { saveBlob } from '@/lib/file-save';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeBlob(content: string, type = 'text/plain'): Blob {
  return new Blob([content], { type });
}

// ─── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // jsdom does not implement URL.createObjectURL / revokeObjectURL; define stubs.
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});

// ─── Browser branch ─────────────────────────────────────────────────────────

describe('saveBlob – browser branch (isTauri = false)', () => {
  beforeEach(() => {
    isTauri.mockReturnValue(false);
  });

  it('returns null', async () => {
    const result = await saveBlob(makeBlob('hi'), 'out.eml');
    expect(result).toBeNull();
  });

  it('calls URL.createObjectURL once with the blob', async () => {
    const blob = makeBlob('hi');
    await saveBlob(blob, 'out.eml');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('creates an anchor with the correct download attribute and clicks it', async () => {
    // Spy on document.createElement to capture the anchor element.
    const originalCreateElement = document.createElement.bind(document);
    let capturedAnchor: HTMLAnchorElement | null = null;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          capturedAnchor = el as HTMLAnchorElement;
          vi.spyOn(capturedAnchor, 'click');
        }
        return el;
      });

    await saveBlob(makeBlob('hi'), 'out.eml');

    expect(capturedAnchor).not.toBeNull();
    expect((capturedAnchor as unknown as HTMLAnchorElement).download).toBe('out.eml');
    expect((capturedAnchor as unknown as HTMLAnchorElement).click).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
  });

  it('calls URL.revokeObjectURL once with the fake object URL', async () => {
    await saveBlob(makeBlob('hi'), 'out.eml');
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('does NOT call invoke', async () => {
    await saveBlob(makeBlob('hi'), 'out.eml');
    expect(invoke).not.toHaveBeenCalled();
  });
});

// ─── Tauri branch ────────────────────────────────────────────────────────────

describe('saveBlob – Tauri branch (isTauri = true)', () => {
  beforeEach(() => {
    isTauri.mockReturnValue(true);
    invoke.mockResolvedValue('/Users/me/Downloads/out.eml');
  });

  it('returns the path resolved by invoke', async () => {
    const result = await saveBlob(makeBlob('hi'), 'out.eml');
    expect(result).toBe('/Users/me/Downloads/out.eml');
  });

  it('calls invoke once with the correct command and arguments', async () => {
    await saveBlob(makeBlob('hi'), 'out.eml');
    expect(invoke).toHaveBeenCalledOnce();
    const [cmd, args] = invoke.mock.calls[0] as [string, { filename: string; dataBase64: string }];
    expect(cmd).toBe('save_file_to_dir');
    expect(args.filename).toBe('out.eml');
    expect(args.dataBase64).toBeTruthy();
    // Basic base64 character-set check
    expect(/^[A-Za-z0-9+/]+=*$/.test(args.dataBase64)).toBe(true);
  });

  it('does NOT call URL.createObjectURL (browser path is not taken)', async () => {
    await saveBlob(makeBlob('hi'), 'out.eml');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('propagates an invoke rejection (disk full scenario)', async () => {
    invoke.mockRejectedValue(new Error('disk full'));
    await expect(saveBlob(makeBlob('hi'), 'out.eml')).rejects.toThrow('disk full');
  });
});

// ─── Base64 correctness – chunked arrayBufferToBase64 ────────────────────────

describe('saveBlob – base64 round-trip (chunked path, > 0x8000 bytes)', () => {
  it('encodes a large blob correctly (byte length round-trips)', async () => {
    isTauri.mockReturnValue(true);

    // 70 000 bytes exceeds the 0x8000 (32 768) chunk size, so the for-loop
    // inside arrayBufferToBase64 executes more than once.
    const length = 70_000;
    const original = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      original[i] = i % 256;
    }
    const blob = new Blob([original]);

    invoke.mockResolvedValue('/path/large.bin');
    await saveBlob(blob, 'large.bin');

    expect(invoke).toHaveBeenCalledOnce();
    const [, args] = invoke.mock.calls[0] as [string, { filename: string; dataBase64: string }];
    const decoded = atob(args.dataBase64);
    expect(decoded.length).toBe(length);
  });
});
