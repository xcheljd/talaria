# Architecture

How the migrated system works: components, relationships, data flows, invariants.

## High-Level Architecture

```
React SPA (Vite + TypeScript + Tailwind v4)
├── App Shell (React Router)
│   ├── Header (shared nav, theme toggle)
│   ├── / → TemplateGeneratorPage
│   ├── /start → ProfileSettingsPage
│   └── /promotion → PromotionBuilderPage
├── Contexts
│   ├── ThemeProvider (light/dark + palette)
│   └── ProfileProvider (localStorage-backed)
├── Zustand Stores
│   └── promotionStore (promotion page state)
├── Shared Utilities (migrated as-is)
│   ├── emailUtils (EML generation, RFC compliance)
│   ├── html-utils (XSS sanitization)
│   ├── signature (email signatures)
│   ├── db (IndexedDB wrapper)
│   ├── profile (localStorage helpers)
│   └── emailPreviewUtils (HTML preview rendering)
├── shadcn/ui Components (src/components/ui/)
│   ├── Button, Card, Input, Label, Select
│   ├── Tabs, Dialog, AlertDialog, Toast
│   ├── Form, Badge, Separator, Tooltip
│   ├── DropdownMenu, Collapsible, Textarea, Switch
└── Promotion Components (src/components/promotion/)
    ├── CollapsibleCard (card + collapsible + status dot)
    └── SkinnyColumnBar (collapsed column sidebar)
```

## Data Flow

1. **Profile Data**: localStorage → ProfileProvider → consumed by templates/signature generation
2. **Theme**: localStorage → ThemeProvider → sets CSS variables on :root → Tailwind reads via @theme inline
3. **Template Generation**: User selects template → React Hook Form collects fields → template.generate(data) → output in Preview/Text tabs
4. **Promotion Builder**: Form inputs → Zustand store (auto-save to IndexedDB) → HTML generation → iframe preview
5. **Email Export**: Generated HTML → emailUtils.createEMLFile() → Blob download (individual or ZIP via jszip)
6. **Tauri IPC**: useTauri() hook → window.__TAURI__.core.invoke() → Rust backend for folder dialogs

## Key Invariants

- All user input is sanitized via sanitizeHTML() before rendering
- EML files use CRLF line endings (RFC 5322)
- Email signatures depend on job title (management → company email, staff → store email)
- Theme state persists via localStorage, applied as CSS variables on :root
- Profile data accessed through helper functions, never direct localStorage
- IndexedDB used for binary data (PDFs) and bulk email recipients only

## Color Palette System

16 palettes defined as CSS variable overrides in hex color format:
- Each palette overrides: --background, --foreground, --primary, --secondary, --muted, --accent, --destructive, --border, --input, --ring, --card, --popover + their foreground variants
- Applied via data attributes on :root: `data-theme="light|dark"`, `data-light-palette="github|..."`, `data-dark-palette="github|..."`
- Tailwind reads these via `@theme inline` block mapping CSS vars to Tailwind tokens

## State Management Strategy

| State | Location | Pattern |
|-------|----------|---------|
| Theme (light/dark/palette) | localStorage | React Context (ThemeProvider) |
| User profile | localStorage | React Context (ProfileProvider) |
| Template form fields | Component state | React Hook Form |
| Profile form fields | Component state | React Hook Form + Zod |
| Promotion entries, hours, items | Zustand store | Zustand (auto-save to IndexedDB) |
| PDF attachments | IndexedDB | Custom hook (useIndexedDB) |
| Bulk email recipients | IndexedDB | Custom hook (useIndexedDB) |
| Navigation | URL | React Router |
