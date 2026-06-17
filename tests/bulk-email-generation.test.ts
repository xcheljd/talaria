/**
 * Unit tests for bulk-email-generation.
 *
 * Covers the recipient/batch helper functions and the early-return and
 * download branches of generateEmailBatches(), which previously had almost
 * no direct coverage (exercised only indirectly through the component).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  computeEmailStats,
  clampBatchSize,
  getSavedBatchSize,
  getSavedDownloadFormat,
  generateEmailBatches,
  DEFAULT_BATCH_SIZE,
} from '../src/lib/bulk-email-generation';
import { StorageKeys } from '../src/lib/storage-keys';
import { usePromotionStore } from '../src/stores/promotion-store';
import { saveBlob } from '../src/lib/file-save';
import { toast } from 'sonner';

vi.mock('../src/lib/file-save', () => ({
  saveBlob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Snapshot the store's initial state so each test starts from valid defaults.
const INITIAL_STATE = usePromotionStore.getState();

beforeEach(() => {
  usePromotionStore.setState(INITIAL_STATE, true);
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  usePromotionStore.setState(INITIAL_STATE, true);
});

describe('computeEmailStats', () => {
  it('returns all-zero stats for empty input', () => {
    expect(computeEmailStats('')).toEqual({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      validEmails: [],
      invalidEmails: [],
    });
  });

  it('counts valid and invalid emails separately', () => {
    const stats = computeEmailStats('a@b.com; notanemail x@y.com');
    expect(stats.valid).toBe(2);
    expect(stats.invalid).toBe(1);
    expect(stats.validEmails).toEqual(['a@b.com', 'x@y.com']);
    expect(stats.invalidEmails).toEqual(['notanemail']);
  });

  it('detects duplicates case-insensitively', () => {
    const stats = computeEmailStats('A@B.com, a@b.com');
    expect(stats.total).toBe(1);
    expect(stats.valid).toBe(1);
    expect(stats.duplicates).toBe(1);
  });

  it('splits on whitespace, commas, semicolons and newlines', () => {
    const stats = computeEmailStats('a@b.com b@c.com,c@d.com;d@e.com\ne@f.com');
    expect(stats.valid).toBe(5);
  });
});

describe('clampBatchSize', () => {
  it('rounds to the nearest 50', () => {
    expect(clampBatchSize(520)).toBe(500);
    expect(clampBatchSize(530)).toBe(550);
  });

  it('clamps below the minimum up to 50', () => {
    expect(clampBatchSize(0)).toBe(50);
    expect(clampBatchSize(10)).toBe(50);
  });

  it('clamps above the maximum down to 1000', () => {
    expect(clampBatchSize(5000)).toBe(1000);
  });
});

describe('getSavedBatchSize', () => {
  it('returns the default when nothing is persisted', () => {
    expect(getSavedBatchSize()).toBe(DEFAULT_BATCH_SIZE);
  });

  it('returns the clamped persisted value', () => {
    localStorage.setItem(StorageKeys.bulkEmailBatchSize, '750');
    expect(getSavedBatchSize()).toBe(750);
  });

  it('falls back to the default on a non-numeric value', () => {
    localStorage.setItem(StorageKeys.bulkEmailBatchSize, 'abc');
    expect(getSavedBatchSize()).toBe(DEFAULT_BATCH_SIZE);
  });
});

describe('getSavedDownloadFormat', () => {
  it('defaults to individual', () => {
    expect(getSavedDownloadFormat()).toBe('individual');
  });

  it('returns zip when persisted', () => {
    localStorage.setItem(StorageKeys.bulkEmailDownloadFormat, 'zip');
    expect(getSavedDownloadFormat()).toBe('zip');
  });

  it('treats any other value as individual', () => {
    localStorage.setItem(StorageKeys.bulkEmailDownloadFormat, 'garbage');
    expect(getSavedDownloadFormat()).toBe('individual');
  });
});

describe('generateEmailBatches', () => {
  it('warns and returns false when there are no valid recipients', async () => {
    usePromotionStore.setState({ bulkEmailRecipients: '   ' });
    const result = await generateEmailBatches();
    expect(result).toBe(false);
    expect(toast.warning).toHaveBeenCalledOnce();
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('returns false without re-running when already generating', async () => {
    usePromotionStore.setState({
      bulkEmailRecipients: 'a@b.com',
      bulkEmailGenerating: true,
    });
    const result = await generateEmailBatches();
    expect(result).toBe(false);
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('downloads one EML per batch in individual mode and returns true', async () => {
    usePromotionStore.setState({
      bulkEmailRecipients: 'a@b.com\nc@d.com',
      bulkEmailGenerating: false,
    });
    const result = await generateEmailBatches();
    expect(result).toBe(true);
    // Two recipients, default batch size 500 → a single batch → one save
    expect(saveBlob).toHaveBeenCalledOnce();
    // Generation flag is reset in the finally block
    expect(usePromotionStore.getState().bulkEmailGenerating).toBe(false);
  });

  it('produces a zip in zip mode', async () => {
    const file = vi.fn();
    const generateAsync = vi.fn().mockResolvedValue(new Blob(['zip']));
    vi.doMock('jszip', () => ({
      default: class {
        file = file;
        generateAsync = generateAsync;
      },
    }));
    localStorage.setItem(StorageKeys.bulkEmailDownloadFormat, 'zip');
    usePromotionStore.setState({
      bulkEmailRecipients: 'a@b.com\nc@d.com',
      bulkEmailGenerating: false,
    });

    const result = await generateEmailBatches();

    expect(result).toBe(true);
    expect(generateAsync).toHaveBeenCalled();
    expect(saveBlob).toHaveBeenCalledOnce();
    vi.doUnmock('jszip');
  });

  it('reports an error and returns false when saving fails', async () => {
    vi.mocked(saveBlob).mockRejectedValueOnce(new Error('disk full'));
    usePromotionStore.setState({
      bulkEmailRecipients: 'a@b.com',
      bulkEmailGenerating: false,
    });
    const result = await generateEmailBatches();
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledOnce();
    expect(usePromotionStore.getState().bulkEmailGenerating).toBe(false);
  });
});
