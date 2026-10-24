import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/profile', () => ({
  getStorePhone: vi.fn().mockReturnValue('702-555-0190'),
  getStoreEmail: vi.fn().mockReturnValue('store@example.com'),
  getDirections: vi.fn().mockReturnValue('Entrance E'),
}));

import { getStorePhone } from '@/lib/profile';
import {
  useSavedSetsStore,
  parseSavedSets,
  migrateLegacyDefaults,
  readSavedSets,
} from '@/stores/saved-sets-store';
import { captureSection, loadSection } from '@/lib/saved-sets-actions';
import { usePromotionStore } from '@/stores/promotion-store';
import { StorageKeys } from '@/lib/storage-keys';

const line = (text: string) => ({
  text,
  bold: false,
  italic: false,
  underline: false,
});

beforeEach(() => {
  localStorage.clear();
  useSavedSetsStore.getState().reload();
  usePromotionStore.getState().resetState();
});

describe('saved sets store', () => {
  it('saves, renames, updates and persists a set', () => {
    const store = useSavedSetsStore.getState();
    const saved = store.saveSet('specialHours', '  Holiday 2026 ', [
      { day: 'Thu Nov 26', hours: 'CLOSED' },
    ]);
    expect(saved.name).toBe('Holiday 2026');
    useSavedSetsStore
      .getState()
      .renameSet('specialHours', saved.id, 'Thanksgiving');
    useSavedSetsStore
      .getState()
      .updateSet('specialHours', saved.id, [
        { day: 'Fri Nov 27', hours: '6AM-10PM' },
      ]);
    const persisted = readSavedSets().specialHours;
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe('Thanksgiving');
    expect(persisted[0].data).toEqual([
      { day: 'Fri Nov 27', hours: '6AM-10PM' },
    ]);
  });

  it('saving an existing name (any case) replaces that set instead of duplicating', () => {
    const s = useSavedSetsStore.getState();
    const first = s.saveSet('importantNotes', 'Outlet', [line('A')]);
    expect(
      useSavedSetsStore.getState().findByName('importantNotes', 'outlet ')?.id
    ).toBe(first.id);
    useSavedSetsStore
      .getState()
      .saveSet('importantNotes', 'OUTLET', [line('B')]);
    const list = useSavedSetsStore.getState().sets.importantNotes;
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(first.id);
    expect(list[0].data[0].text).toBe('B');
  });

  it('delete returns the set and restore puts it back in place', () => {
    const s = useSavedSetsStore.getState();
    s.saveSet('howToShop', 'A', [line('a')]);
    const b = s.saveSet('howToShop', 'B', [line('b')]);
    s.saveSet('howToShop', 'C', [line('c')]);
    const removed = useSavedSetsStore.getState().deleteSet('howToShop', b.id)!;
    expect(
      useSavedSetsStore.getState().sets.howToShop.map((x) => x.name)
    ).toEqual(['A', 'C']);
    useSavedSetsStore
      .getState()
      .restoreSet('howToShop', removed.set, removed.index);
    expect(
      useSavedSetsStore.getState().sets.howToShop.map((x) => x.name)
    ).toEqual(['A', 'B', 'C']);
  });

  it('drops corrupt entries and keeps valid ones', () => {
    const sets = parseSavedSets({
      howToShop: [
        { id: '1', name: 'ok', data: [line('x')] },
        { id: '2', name: '', data: [] },
        { id: '3', name: 'bad', data: 'nope' },
        null,
      ],
      newsletter: [
        {
          id: 'n',
          name: 'News',
          data: {
            heading: 'H',
            body: '<p>x</p>',
            style: { borderColor: 'javascript:alert(1)' },
          },
        },
      ],
      specialHours: 'garbage',
    });
    expect(sets.howToShop.map((s) => s.name)).toEqual(['ok']);
    expect(sets.specialHours).toEqual([]);
    expect(sets.newsletter[0].data.style.borderColor).toBeNull();
  });
});

describe('capture and load', () => {
  it('saves linked lines as links and refills them from the current profile on load', () => {
    usePromotionStore.setState({
      howToShopItems: [
        { id: 1, ...line('Visit us') },
        {
          id: 2,
          ...line('Call 702-555-0190 for availability'),
          autoField: 'storePhone',
        },
      ],
    });
    const data = captureSection('howToShop');
    expect(data[1]).toEqual({ ...line(''), autoField: 'storePhone' });

    vi.mocked(getStorePhone).mockReturnValue('555-111-2222');
    usePromotionStore.setState({ howToShopItems: [] });
    loadSection('howToShop', data);
    const items = usePromotionStore.getState().howToShopItems;
    expect(items.map((i) => i.text)).toEqual([
      'Visit us',
      'Call 555-111-2222 for availability',
    ]);
  });

  it('load replaces the section and undo restores it exactly', () => {
    const before = [{ id: 9, day: 'Sat', hours: '9-5' }];
    usePromotionStore.setState({ specialHours: before });
    const undo = loadSection('specialHours', [
      { day: 'Thu Nov 26', hours: 'CLOSED' },
    ]);
    expect(usePromotionStore.getState().specialHours.map((h) => h.day)).toEqual(
      ['Thu Nov 26']
    );
    undo();
    expect(usePromotionStore.getState().specialHours).toEqual(before);
  });

  it('newsletter sets carry heading, body and box style', () => {
    usePromotionStore.setState({
      newsletterHeading: 'Holiday',
      newsletterBody: '<h2>Holiday</h2><p>Ship by Dec 15</p>',
      newsletterStyle: {
        ...usePromotionStore.getState().newsletterStyle,
        borderStyle: 'full',
      },
    });
    const data = captureSection('newsletter');
    usePromotionStore.getState().resetState();
    const undo = loadSection('newsletter', data);
    const s = usePromotionStore.getState();
    expect(s.newsletterBody).toContain('Ship by Dec 15');
    expect(s.newsletterStyle.borderStyle).toBe('full');
    undo();
    expect(usePromotionStore.getState().newsletterBody).toBe('');
  });
});

describe('fresh start seeding + Defaults migration', () => {
  it('a fresh build seeds only the linked lines', () => {
    usePromotionStore.getState().initializeDefaultItems();
    const s = usePromotionStore.getState();
    expect(s.howToShopItems.map((i) => i.autoField)).toEqual([
      'storePhone',
      'storeEmail',
    ]);
    expect(s.importantNotesItems.map((i) => i.autoField)).toEqual([
      'storeDirections',
    ]);
  });

  it('existing users get a "Defaults" set once; new users get none', () => {
    localStorage.setItem(StorageKeys.promotionBuilderState, '{}');
    expect(migrateLegacyDefaults()).toBe(true);
    const sets = readSavedSets();
    expect(sets.howToShop.map((s) => s.name)).toEqual(['Defaults']);
    expect(sets.importantNotes[0].data.map((l) => l.text)).toContain(
      '*Select models only'
    );
    expect(migrateLegacyDefaults()).toBe(false);
    expect(readSavedSets().howToShop).toHaveLength(1);

    localStorage.clear();
    expect(migrateLegacyDefaults()).toBe(false);
    expect(readSavedSets().howToShop).toEqual([]);
  });
});
