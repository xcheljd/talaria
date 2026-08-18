# UI Decisions Log

Durable decisions on deferred shadcn-adoption items (from the 2026-08 audit +
backlog passes). Read before re-litigating these.

## Empty component — NOT adopted (decision 2026-08-18)

`@shadcn/empty` was evaluated against all 5 empty-state sites and **rejected
for all of them**. Reasons:

- `EmptyTitle` renders a `div`, so `EmailPreview`'s `<h3>` (its only heading in
  the preview pane) would lose heading semantics — an a11y regression.
- `Empty` ships `border-dashed`, `gap-6`, `p-6 md:p-12`, and `flex-1`. That is
  a *hero* empty state. 4 of the 5 sites are **compact inline list placeholders**
  (`py-2`/`py-4`, one line of text) — adopting `Empty` would bloat them.
- The 5th site (`EmailPreview`) is a hero state, but its intentional spacious
  look (`py-16`, 16-icon) differs enough from `Empty`'s defaults that
  overriding them would make the swap cosmetic-only.

Sites (as of 2026-08-18): `EmailPreview.tsx` EmptyPreviewState,
`VersionHistory.tsx` snapshot list, `DiscountEntriesEditor.tsx`,
`SpecialHoursEditor.tsx`, `FormattableItemEditor.tsx` entry placeholders.

Revisit only if: (a) shadcn's `Empty`/`EmptyTitle` change to support real
heading semantics + compact variants, or (b) the app adds many more hero
empty states (3+) that would benefit from shared markup.

## Tooltip delay — unified at 200ms (decision 2026-08-18)

`App.tsx` is the single app-wide `TooltipProvider` with `delayDuration={200}`.
`PreviewToolbar.tsx` previously nested a second provider at 200ms while the
app default was 0 (instant) — inconsistent and redundant. Fixed by setting the
app provider to 200ms and deleting the nested provider.

- 0ms tooltips flicker on dense toolbars (rapid hover sweeps); 200ms matches
  standard OS tooltip timing and the in-toolbar behavior users already had.
- Do NOT move `delayDuration` into the `Tooltip` primitive itself — the
  provider owns it by design (radix + shadcn convention); per-instance
  overrides stay available via nested providers.

## Not-defect items (confirmed, do not re-report)

- `newsletter/toolbar.tsx` `ToolbarSeparator` stays a hand-rolled
  `<div className="mx-0.5 h-5 w-px bg-border" />`: `Separator`'s
  `data-[orientation=vertical]:h-full` (specificity 0,2,0) beats a plain
  `h-5` (0,1,0) regardless of order — the divider would stretch. Same trap
  documented in `tabs.tsx`.
- `PreviewToolbar.tsx` keeps native `title=` on its `ToggleGroupItem`
  buttons: `ToggleGroupItem` + `TooltipTrigger` both write `data-state` on the
  same node under `asChild`, which kills the active-state styling.
- `resizable-panels.tsx` is a hand-rolled pointer-events split-pane, **not**
  shadcn's `react-resizable-panels` — swapping it is a rewrite, not an update.
  `clearable-input.tsx` / `clearable-textarea.tsx` are likewise project-custom,
  not registry items.