/** Profile Export carries saved sets; the exported file imports them back. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const saved = vi.hoisted(() => ({ blob: null as Blob | null }));
vi.mock('@/lib/file-save', () => ({
  saveBlob: vi.fn(async (b: Blob) => {
    saved.blob = b;
  }),
}));

import { exportProfileJson } from '@/components/profile/profile-form-utils';
import { useSavedSetsStore } from '@/stores/saved-sets-store';
import type { ProfileFormValues } from '@/lib/profile-validation';

beforeEach(() => {
  localStorage.clear();
  useSavedSetsStore.getState().reload();
});

describe('profile export + saved sets', () => {
  it('round-trips sets through the exported file', async () => {
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Thanksgiving 2026', [
        { day: 'Thu Nov 26', hours: 'CLOSED' },
      ]);
    await exportProfileJson({} as ProfileFormValues, 'github', 'github');
    const file = JSON.parse(await saved.blob!.text());
    expect(file.profile).toBeTruthy();
    expect(file.savedSets.specialHours[0].name).toBe('Thanksgiving 2026');

    localStorage.clear();
    useSavedSetsStore.getState().reload();
    expect(useSavedSetsStore.getState().importSets(file.savedSets)).toBe(1);
    expect(useSavedSetsStore.getState().sets.specialHours[0].data).toEqual([
      { day: 'Thu Nov 26', hours: 'CLOSED' },
    ]);
  });
});
