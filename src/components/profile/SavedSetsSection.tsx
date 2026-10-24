/**
 * Settings → Saved Sets: every saved set, grouped by the email section it
 * belongs to. Rename and delete here; saving and loading happen in the email
 * builder (each card's "Sets" menu).
 *
 * Layout mirrors PreferencesSection: one Card, inner bordered panels (p-4).
 */
import { useShallow } from 'zustand/react/shallow';
import {
  useSavedSetsStore,
  type SavedSetSection,
} from '@/stores/saved-sets-store';
import { SavedSetList } from '@/components/promotion/SavedSetsMenu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const GROUPS: { section: SavedSetSection; title: string; noun: string }[] = [
  { section: 'howToShop', title: 'How to Shop', noun: 'entries' },
  { section: 'importantNotes', title: 'Important Notes', noun: 'notes' },
  { section: 'specialHours', title: 'Special Hours', noun: 'hours' },
  { section: 'newsletter', title: 'Newsletter', noun: 'newsletter' },
];

export function SavedSetsSection() {
  const counts = useSavedSetsStore(
    useShallow((s) => GROUPS.map((g) => s.sets[g.section].length))
  );
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Saved Sets</CardTitle>
        <CardDescription className="text-pretty">
          {total === 0
            ? 'Nothing saved yet. In the email builder, use a card’s Sets menu to save its entries.'
            : 'Entries you saved in the email builder. Load them from each card’s Sets menu. Included in Export and Import.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {GROUPS.map((g, i) => (
          <section
            key={g.section}
            aria-labelledby={`saved-sets-${g.section}`}
            data-testid={`saved-sets-group-${g.section}`}
            className="flex flex-col gap-3 rounded-lg border bg-card p-4"
          >
            <h3
              id={`saved-sets-${g.section}`}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {g.title}
              <span className="text-xs font-normal text-muted-foreground">
                {counts[i]}
              </span>
            </h3>
            <SavedSetList
              section={g.section}
              noun={g.noun}
              emptyText="None saved."
            />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
