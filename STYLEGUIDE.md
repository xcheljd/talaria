# Talaria UI style guide

Rules for app code (everything outside `src/components/ui/`). The shadcn
components in `src/components/ui/` own their internal spacing; app code
composes them and only decides the space _between_ things.

## Spacing scale

Four steps, each with one meaning. Spacing lives on the **container**
(`flex flex-col gap-*` / `flex gap-*`), never on the child (`mt-*`, `mb-*`,
`space-*`).

| Step | Tailwind | Meaning                                                                                                           |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| 4px  | `gap-1`  | Inside a control: icon + text, chip contents. Usually handled by the shadcn component — don't set it in app code. |
| 8px  | `gap-2`  | A label to its control; a tight row of buttons/toggles; a field's helper text.                                    |
| 16px | `gap-4`  | Between fields or groups inside a card; card padding (`p-4`).                                                     |
| 24px | `gap-6`  | Between cards and page-level sections.                                                                            |

Off-scale values (`gap-0.5`, `gap-1.5`, `gap-3`, odd margins) are allowed
**only inside small self-contained widgets** (badges, swatch grids, the
newsletter formatting toolbar, `IconToolbar`), never for layout.

### Why card padding is 16px, not shadcn's 24px

Talaria's editor cards live in a resizable side panel that can be as narrow
as 280px. 24px padding wastes ~15% of that width, so the app is
deliberately one step denser than shadcn's default card. Page-level layouts
(Settings) still use 24px between sections.

## Forms

- Use `FieldGroup` + `Field` + `FieldLabel` / `FieldDescription` /
  `FieldError` from `@/components/ui/field` for form layout. Don't hand-roll
  `div` + `Label` stacks.
- Inside a card, override the group gap to the card scale:
  `<FieldGroup className="gap-4">` (Field's own label→control gap stays).
- Validation: `data-invalid` on `Field`, `aria-invalid` on the control.
- react-hook-form forms using `FormField`/`FormItem` (`@/components/ui/form`)
  may stay on that API; just keep their container spacing on the scale.

## Other conventions

- `size-N` when width = height. `truncate`, not the three-class combo.
- `cn()` for conditional classes, not template literals.
- Semantic colors only (`bg-primary`, `text-muted-foreground`, `success`,
  `warning`, `info`, `destructive`).
- `<Separator>` for standalone dividers.
- Radix `Tooltip` for tooltips — except on `Toggle`/`ToggleGroupItem`/
  `TabsTrigger`, whose `data-state` collides with Tooltip's; those keep
  native `title=`.
- `<Button>` for action buttons; raw `<button>` only for swatches, grid
  cells, drag handles, and node-view internals (comment why).
