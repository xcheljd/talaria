# TipTap Rich Text Editor — React Integration Research

**Date:** 2026-03-31
**TipTap Version:** 3.x (latest: 3.21.0)
**Sources:** tiptap.dev docs, Context7, npm, GitHub

---

## 1. Required Packages

### Core Packages (always needed)

| Package | Latest | Purpose |
|---|---|---|
| `@tiptap/react` | 3.21.0 | React bindings (`useEditor`, `EditorContent`, `EditorContext`) |
| `@tiptap/starter-kit` | 3.21.0 | Bundle of the most common extensions |

### Additional Extensions Needed (not in StarterKit)

| Package | Import | Purpose |
|---|---|---|
| `@tiptap/extension-text-style` | `TextStyle` from `@tiptap/extension-text-style` | Required dependency for Color and Highlight |
| `@tiptap/extension-color` | `Color` from `@tiptap/extension-color` | Text foreground color |
| `@tiptap/extension-highlight` | `Highlight` from `@tiptap/extension-highlight` | Text background color / highlight |

### Already Included in StarterKit

StarterKit bundles these extensions — **no separate install needed**:

- **Bold** (`@tiptap/extension-bold`)
- **Italic** (`@tiptap/extension-italic`)
- **Underline** (`@tiptap/extension-underline`)
- **Strike** (`@tiptap/extension-strike`)
- **Code** (`@tiptap/extension-code`)
- **Link** (`@tiptap/extension-link`)
- **Heading** (`@tiptap/extension-heading`)
- **BulletList** (`@tiptap/extension-bullet-list`)
- **OrderedList** (`@tiptap/extension-ordered-list`)
- **ListItem** (`@tiptap/extension-list-item`)
- **Blockquote** (`@tiptap/extension-blockquote`)
- **CodeBlock** (`@tiptap/extension-code-block`)
- **HardBreak** (`@tiptap/extension-hard-break`)
- **HorizontalRule** (`@tiptap/extension-horizontal-rule`)
- **Paragraph** (`@tiptap/extension-paragraph`)
- **Document** (`@tiptap/extension-document`)
- **Text** (`@tiptap/extension-text`)
- **History** (undo/redo via `@tiptap/extension-history`)
- **Dropcursor**, **Gapcursor**, **Typography** (functional extensions)

### Install Command

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-highlight
```

---

## 2. Basic Editor Setup with Toolbar (React + TypeScript)

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

function RichTextEditor() {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe: defers rendering to avoid hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Underline is included in StarterKit since v3.x
        // Link is included in StarterKit since v3.x
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: '<p>Hello <strong>world!</strong></p>',
    onUpdate: ({ editor }) => {
      // Called on every change
      const html = editor.getHTML()
      console.log('Content changed:', html)
    },
  })

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <Toolbar editor={editor} />
      {/* Editor area */}
      <EditorContent editor={editor} className="prose p-4 min-h-[200px]" />
    </div>
  )
}
```

> **Note:** `immediatelyRender: false` is recommended for SSR/Next.js. For client-only Vite SPA, it's optional but a good practice.

---

## 3. Extension Reference for Required Features

### Bold, Italic, Underline, Strike, Code
**Source:** All included in StarterKit
**Commands:**
- `editor.chain().focus().toggleBold().run()`
- `editor.chain().focus().toggleItalic().run()`
- `editor.chain().focus().toggleUnderline().run()`
- `editor.chain().focus().toggleStrike().run()`
- `editor.chain().focus().toggleCode().run()`
**Active check:** `editor.isActive('bold')`, `editor.isActive('italic')`, etc.

### Text Color
**Source:** `@tiptap/extension-color`
**Requires:** `@tiptap/extension-text-style` (must be loaded before Color)
**Commands:**
- `editor.chain().focus().setColor('#ff0000').run()` — set color
- `editor.chain().focus().unsetColor().run()` — remove color
**Import:**
```ts
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
```

### Text Highlight (Background Color)
**Source:** `@tiptap/extension-highlight`
**Config:** `Highlight.configure({ multicolor: true })` for multiple colors
**Commands:**
- `editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()` — toggle highlight
- `editor.chain().focus().unsetHighlight().run()` — remove highlight
**Import:**
```ts
import Highlight from '@tiptap/extension-highlight'
```
**Output HTML:** `<mark style="background-color: #fef08a;">text</mark>`

### Headings (H1-H3)
**Source:** Included in StarterKit
**Config:** `StarterKit.configure({ heading: { levels: [1, 2, 3] } })`
**Commands:**
- `editor.chain().focus().toggleHeading({ level: 1 }).run()`
- `editor.chain().focus().setParagraph().run()` — back to paragraph
**Active check:** `editor.isActive('heading', { level: 1 })`

### Bullet Lists & Ordered Lists
**Source:** Both included in StarterKit
**Commands:**
- `editor.chain().focus().toggleBulletList().run()`
- `editor.chain().focus().toggleOrderedList().run()`
**Active check:** `editor.isActive('bulletList')`, `editor.isActive('orderedList')`

### Links
**Source:** Included in StarterKit (since v3.x)
**Commands:**
- `editor.chain().focus().extendMarkRange('link').setLink({ href: 'https://example.com' }).run()` — set link
- `editor.chain().focus().unsetLink().run()` — remove link
**Active check:** `editor.isActive('link')`
**Config:** `StarterKit.configure({ link: { openOnClick: false, autolink: true } })`

---

## 4. Get/Set HTML Content

### Get HTML
```ts
const html = editor.getHTML()
// Example output: '<h2>Hello world</h2><p>This is <strong>bold</strong> text.</p>'
```

### Set HTML (replace all content)
```ts
editor.commands.setContent('<p>New content here</p>')
```

### Set HTML on initialization
```ts
const editor = useEditor({
  content: '<p>Initial content</p>',
  extensions: [StarterKit],
})
```

### Get JSON (alternative to HTML)
```ts
const json = editor.getJSON()
// Returns a ProseMirror-compatible JSON document
```

### Set JSON content
```ts
editor.commands.setContent({ type: 'doc', content: [...] })
```

---

## 5. Toolbar Implementation

### Fixed Toolbar (recommended for our use case)

```tsx
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, Link, Highlighter, Palette
} from 'lucide-react'

interface ToolbarProps {
  editor: Editor | null
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      {/* Headings */}
      <Button
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" /> {/* Separator */}

      {/* Text Formatting */}
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Lists */}
      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>

      {/* Link */}
      <Button
        variant={editor.isActive('link') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }
        }}
      >
        <Link className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Highlight */}
      <Button
        variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      {/* Text Color (simplified — in production, use a color picker) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setColor('#ef4444').run()}
      >
        <Palette className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  )
}
```

### Floating Toolbar (Bubble Menu)
TipTap provides a built-in `BubbleMenu` component:

```tsx
import { BubbleMenu } from '@tiptap/react'

// Inside your component:
<BubbleMenu editor={editor}>
  <div className="flex gap-1 bg-popover border rounded-lg p-1 shadow-lg">
    <Button size="icon" variant="ghost"
      onClick={() => editor.chain().focus().toggleBold().run()}>
      <Bold className="h-4 w-4" />
    </Button>
    {/* ... more buttons */}
  </div>
</BubbleMenu>
```

---

## 6. Tailwind CSS Integration & Gotchas

### How Tiptap renders content
TipTap is **headless** — it renders standard HTML tags (`<p>`, `<strong>`, `<h1>`, `<ul>`, etc.) inside a `contenteditable` div. You style the output yourself.

### Styling the editor content area

**Option A: Use Tailwind `prose` class (from `@tailwindcss/typography`)**
```html
<EditorContent editor={editor} className="prose prose-sm max-w-none" />
```
This is the simplest approach — `prose` styles all standard HTML tags nicely.

**Option B: Use Tailwind utility classes directly**
TipTap generates standard HTML, so you can target elements with Tailwind:
```css
/* In your global CSS or with @apply */
.tiptap h1 { @apply text-2xl font-bold; }
.tiptap h2 { @apply text-xl font-semibold; }
.tiptap ul { @apply list-disc pl-4; }
.tiptap a { @apply text-blue-600 underline; }
```

**Option C: The `.tiptap` class**
The editor automatically gets a `.tiptap` class on the contenteditable element, making it easy to scope styles.

### Known Gotchas with Tailwind

1. **Tailwind v4 reset removes default styles.** Since Tailwind v4 applies a CSS reset (like Preflight), all default heading sizes, list bullets, link colors, etc. are stripped. You MUST add styles for TipTap content (either `prose` or custom styles).

2. **`@tailwindcss/typography` plugin** is highly recommended — add `prose` class to the editor container for beautiful defaults. Install: `npm install @tailwindcss/typography`

3. **No built-in CSS** — TipTap intentionally ships zero CSS. All visual styling is your responsibility.

4. **Color extension uses inline styles** — `setColor()` outputs `<span style="color: #ff0000">text</span>`, which Tailwind cannot control. This is fine since it's dynamic user content.

5. **Highlight uses `<mark>` tags** — style with `.tiptap mark { ... }` or `prose` handles it.

6. **Placeholder** — the `@tiptap/extension-placeholder` extension adds a `data-placeholder` attribute and `is-empty` class. Style with:
   ```css
   .tiptap.is-empty::before {
     @apply text-muted-foreground;
     content: attr(data-placeholder);
     float: left;
     pointer-events: none;
     height: 0;
   }
   ```

---

## 7. Bundle Size Considerations

### Estimated Sizes (gzip)

| Package | Estimated Size (gzip) | Notes |
|---|---|---|
| `@tiptap/core` | ~25-30 KB | Core ProseMirror-based engine |
| `@tiptap/react` | ~5 KB | React bindings |
| `@tiptap/starter-kit` | ~35-45 KB | All common extensions bundled |
| `@tiptap/extension-text-style` | ~2 KB | Required for Color |
| `@tiptap/extension-color` | ~3 KB | Text color |
| `@tiptap/extension-highlight` | ~3 KB | Text highlight |
| **Total (all above)** | **~75-90 KB (gzip)** | Reasonable for a rich text editor |

### Optimization Tips

1. **Don't import individual extensions from StarterKit** — StarterKit is already a bundle. If you need ALL of them, just use StarterKit.
2. **Disable unused StarterKit extensions:**
   ```ts
   StarterKit.configure({
     codeBlock: false,
     blockquote: false,
     horizontalRule: false,
   })
   ```
3. **Import only what you need** if bundle size is critical — import individual extensions instead of StarterKit.
4. **Tree-shaking works** — unused extensions are removed by Vite/Webpack in production builds.
5. **ProseMirror dependency** — TipTap is built on ProseMirror, which adds some unavoidable base weight (~30KB gzip).

---

## 8. License

### Core Editor: MIT License ✅
- `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`
- All standard extensions (`extension-bold`, `extension-italic`, `extension-color`, `extension-highlight`, `extension-heading`, `extension-link`, `extension-underline`, etc.)
- **Free for any use** including commercial
- Source: https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md

### Pro Extensions: Paid License 💰
- Tiptap offers "Pro" extensions requiring a paid subscription:
  - **Collaboration** (real-time editing via Hocuspocus)
  - **Comments** (inline commenting)
  - **Content AI** (AI-powered writing)
  - Some advanced UI components
- These are NOT needed for our use case (basic rich text editing)
- Pro License: https://tiptap.dev/pro-license

### Our Required Extensions — All MIT ✅

| Feature | Extension | License |
|---|---|---|
| Bold | `@tiptap/extension-bold` (in StarterKit) | MIT |
| Italic | `@tiptap/extension-italic` (in StarterKit) | MIT |
| Underline | `@tiptap/extension-underline` (in StarterKit) | MIT |
| Text Color | `@tiptap/extension-color` | MIT |
| Highlight | `@tiptap/extension-highlight` | MIT |
| Headings H1-H3 | `@tiptap/extension-heading` (in StarterKit) | MIT |
| Bullet Lists | `@tiptap/extension-bullet-list` (in StarterKit) | MIT |
| Links | `@tiptap/extension-link` (in StarterKit) | MIT |

**Verdict:** No paid extensions needed. Everything we need is MIT-licensed.

---

## 9. Additional Notes & Caveats

### Version 3.x (Current)
- TipTap v3.x is the latest stable line (3.21.0 as of March 2026)
- StarterKit now includes **Link** and **Underline** (they were separate in v2)
- `immediatelyRender: false` option added for SSR safety

### React 19 Compatibility
- TipTap 3.x supports React 18 and React 19
- The `useEditor` hook manages the editor lifecycle automatically

### shadcn/ui Integration
- TipTap is headless — it renders no UI. This makes it a perfect fit with shadcn/ui.
- Toolbar buttons can use shadcn/ui `<Button>` components
- Color pickers can use shadcn/ui `<Popover>` + `<Input>` or custom color swatches
- The editor area can be wrapped in shadcn/ui card-like containers

### Performance Considerations
- `onUpdate` fires on every keystroke — debounce if saving to server
- `editor.getHTML()` is synchronous and fast
- TipTap uses ProseMirror's immutable document model — efficient for large documents

### Testing
- TipTap works well with React Testing Library and Playwright
- For unit tests, you can create an editor instance directly:
  ```ts
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  
  const editor = new Editor({
    extensions: [StarterKit],
    content: '<p>Test</p>',
  })
  expect(editor.getHTML()).toContain('<p>Test</p>')
  ```

---

## 10. Quick Start Cheat Sheet

```bash
# Install packages
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-highlight
```

```tsx
// Minimal working editor
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

function Editor() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: '<p>Start typing...</p>',
  })

  return <EditorContent editor={editor} className="prose max-w-none" />
}
```

---

## Key Documentation Links

- Getting Started: https://tiptap.dev/docs/editor/getting-started/overview
- React Install: https://tiptap.dev/docs/editor/getting-started/install/react
- Styling Guide: https://tiptap.dev/docs/editor/getting-started/style-editor
- Extensions Overview: https://tiptap.dev/docs/editor/extensions/overview
- StarterKit: https://tiptap.dev/docs/editor/extensions/functionality/starterkit
- Color Extension: https://tiptap.dev/docs/editor/extensions/functionality/color
- Highlight Extension: https://tiptap.dev/docs/editor/extensions/marks/highlight
- GitHub: https://github.com/ueberdosis/tiptap
- Open Source & License: https://tiptap.dev/open-source-to-platform
