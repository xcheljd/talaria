# Talaria — Features Overview

Talaria is a campaign email and customer-communication template generator that **any brand can make its own**. Set your company, store, products, and branding once on the Settings page, then generate promotion campaigns, newsletters, and email/text/phone templates — there are no hardcoded brand assumptions, so it works for any store or company out of the box.

It ships as a single-page React app (web) with an optional **Tauri 2** desktop shell.

## 🚀 Core Application Features

### Template System

- **Customer Email Templates** (7)
  - New Customer Welcome
  - New Model Arrival alerts
  - Back-in-Stock follow-ups
  - Limited Edition alerts
  - Warranty registration and care tips
  - Weekly sale notifications
  - VIP reconnection campaigns

- **Phone Order Templates** (5)
  - Order confirmation with details
  - Shipped notifications with tracking
  - Under-$500 approval requests
  - Corporate order approvals
  - Inter-store notifications (multi-store retailers)

- **Text Message Templates** (3)
  - Quick availability responses
  - Post-purchase thank-you messages
  - Interest follow-ups after store visits

- **Enhanced Email Features**
  - Editable subject lines on all templates that support them
  - Dual output: text body + HTML email preview
  - EML/EMLTPL download for Outlook and other email clients (RFC 5322/2045, quoted-printable, CRLF line endings)
  - One-click `mailto:` launch for templates that support it
  - Cross-platform compatibility (Outlook, Mac Mail, Gmail, etc.)

### User Experience

- **Real-time Search**: Instant template filtering across all categories
- **Category Navigation**: Quick access to Email, Phone, and Text templates
- **Theme System**: Light/dark modes with 16 palette options
- **Profile Management**: Company, store, employee, and product-noun configuration saved locally — brand-agnostic, with no hardcoded brand values
- **Copy-to-Clipboard**: One-click copying of generated messages
- **Email Client Integration**: Direct `mailto:` links and EML file exports

## 🌟 Promotion Email Builder — The Star Feature

The promotion email template is the most sophisticated feature, combining advanced content management with professional email marketing capabilities.

### Dynamic Content Builder

- **Brand/Product Entries**
  - Add product collections and brands of *your* choosing
  - Configure discount percentages and pricing
  - Drag-and-drop reordering of entries
  - Real-time preview updates

- **Special Hours Section**
  - Configurable store operating hours
  - Default templates for common scenarios
  - Reorderable priority display

- **"How to Shop" Guide**
  - Customizable shopping instructions (auto-refreshed from the profile)
  - Step-by-step customer guidance
  - Editable content with formatting

- **"Important Notes" Section**
  - Key announcements and reminders
  - Drag-and-drop priority management
  - Rich text content support

- **Newsletter Section**
  - Full rich-text editing via TipTap (tables, images, links, highlighting, undo/redo)
  - Color/border theming that matches the email palette

### Advanced Email Features

- **Live HTML Preview**
  - Real-time email rendering as you type
  - Desktop and mobile widths with a light/dark toggle
  - Theme-integrated styling with Aptos-based email layout
  - Automatic signature integration

- **PDF Attachment Support**
  - Upload multiple PDF files (size-validated)
  - On-upload optimization via the native Rust `amatl` command (downsampled embedded JPEGs + object-stream packing — ~59% smaller on real promotion files)
  - Interactive preview modal with iframe rendering
  - Download fallback for unsupported PDFs
  - PDF metadata stored in localStorage; binary data in IndexedDB

- **Smart Subject Line Generation**
  - Auto-generates professional titles based on date ranges
  - Manual override option for custom subjects
  - Multiple subject line suggestions with preview and selection

- **Bulk Email Generation**
  - BCC recipient list management
  - Configurable batch sizes (50–1000 recipients per email)
  - ZIP export of all generated emails
  - Recipient list persistence in IndexedDB

- **Version History**
  - Up to 20 auto-saved snapshots of promotion state
  - Manual named saves and one-click restore from any point

- **Quality Checkers**
  - Accessibility checker: missing alt text, empty links, heading-hierarchy gaps, overly long alt text, missing language direction hints
  - Outlook compatibility checker

### Professional Email Output

- **EML/EMLTPL Export**
  - RFC-compliant MIME structure
  - Quoted-printable encoding
  - CRLF line ending normalization
  - Outlook and Mac Mail compatible

- **HTML Email Format**
  - Professional styling consistent with the configured branding
  - Responsive email layout
  - Automatic employee signature insertion
  - Theme-aware color schemes

### Data Management & Workflow

- **Auto-save & Persistence**
  - Promotion state auto-saved (Zustand store) and restored across sessions
  - IndexedDB for binary PDF data and bulk-email recipient lists
  - Cross-session state preservation

- **Import/Export Capabilities**
  - Export/import promotion configurations as JSON
  - Export/import the profile
  - Load previously saved configurations
  - Backup, restore, and share between stores/colleagues

## 🔐 Security & Performance

### Security

- **XSS Prevention**: All user content sanitized via `sanitizeHTML()`
- **Input Validation**: Zod schemas + per-field validation hints (profile, template fields, imported configs)
- **Safe File Handling**: PDF metadata isolated from binary data (localStorage vs IndexedDB)
- **URL Scheme Validation**: Brand-link URLs validated before being emitted as `href`s

### Performance

- **Code-Split Bundles**: Heavy dependencies (TipTap, jszip) are code-split
- **Native PDF Optimization**: Rust-side JPEG downsampling and object-stream packing keep attachments small
- **Memory Efficiency**: Large binary payloads live in IndexedDB rather than localStorage

## 🎨 Accessibility & Design

### Accessibility

- **Built-in Checker**: The promotion builder scans generated content for missing alt text, empty links, heading-hierarchy gaps, overly long alt text, and missing language direction hints
- **Reduced Motion**: Scroll behavior honors `prefers-reduced-motion`
- **ARIA & Keyboard Support**: Radix UI primitives with built-in ARIA, plus full keyboard navigation
- **Focus Management**: Proper modal and form focus handling
- **High Contrast**: Theme-based contrast options

### Design System

- **Tailwind CSS v4** with oklch design tokens and inline `@theme` config
- **16 Color Palettes** (8 light + 8 dark), persisted and applied via `data-*` attributes
- **shadcn/ui (New York)** components built on Radix UI primitives
- **Responsive Layout**: Desktop-first with mobile support (375px+)
- **Interactive Feedback**: Hover states, transitions, loading indicators (Sonner toasts)

## 🖥️ Desktop & Web

### Web

- **Single-Page App**: React Router v7 SPA — one page with client-side routes
- **Modern Browsers**: Chrome, Firefox, Safari, Edge support
- **Mobile Responsive**: Tablet and phone layouts
- **Works Without the Shell**: Full functionality in a plain browser — the desktop app is optional

### Desktop Application (Tauri 2)

- **Tauri 2 Shell**: Native desktop packaging with a Rust backend
- **Windows Support**: Portable .exe distribution
- **macOS Support**: Universal .app + .dmg builds
- **Linux Support**: Desktop builds via `tauri build`
- **Native Download Folder**: Folder picker + `save_file_to_dir` Rust command; every download routes through it when running in the shell
- **Offline Capability**: Local-first — no backend or network required

## 🔧 Development Features

### Architecture

- **React 19 + TypeScript (strict)**: Modern, type-safe single-page app
- **Vite 8**: Fast development server and optimized production builds
- **Single-Page Routing**: React Router v7 (BrowserRouter) — templates, promotions, and profile settings are routes, not pages
- **State Management**: React Context (theme/profile) + Zustand (promotion store)
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: TipTap for newsletter editing
- **Packaging**: jszip for bulk-email ZIP archives

### Quality Gates

- **Typecheck**: `tsc --noEmit`
- **Linting**: ESLint on `src/`
- **Formatting**: Prettier
- **Unit Tests**: Vitest with enforced coverage thresholds
- **E2E Tests**: Playwright
- **CI**: GitHub Actions builds and tests desktop apps for Windows and macOS

---

## 🎯 Key Differentiators

1. **Promotion Email Builder**: The flagship feature — content management, email marketing, and professional design in one tool
2. **Brand-Agnostic by Design**: No hardcoded brand assumptions — any brand can make it its own
3. **Professional Email Output**: RFC-compliant EML/EMLTPL that integrates with existing email workflows
4. **Native PDF Optimization**: A Rust-side optimizer shrinks attached PDFs before they're stored
5. **Desktop + Web**: Optional Tauri 2 shell with offline capability; the same app runs in any browser
6. **Security & Accessibility First**: XSS sanitization, validated input, built-in accessibility checks

The promotion email builder transforms a simple template generator into a sophisticated email marketing tool while keeping the ease of use expected in a retail environment.
