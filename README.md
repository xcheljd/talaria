# Communication Template Generator

Multi-page template generator app for customer communications (email, text, phone). Built as a Vite SPA with an optional Tauri desktop shell.

## Quick Start

```bash
npm install
npm run dev          # Start dev server on http://localhost:8080
```

## Pages

| Page | URL | Description |
|---|---|---|
| Templates | `/index.html` | Main communication template generator |
| Profile Setup | `/start.html` | User profile and settings configuration |
| Promotions | `/promotion.html` | Promotion email generator |

## Development

```bash
npm run dev              # Vite dev server (port 8080)
npm run build            # Production build to dist/
npm run lint             # ESLint on src/js/**/*.js
npm run format           # Prettier on JS/CSS
npm run test             # Vitest unit tests
npm run test:coverage    # Vitest with coverage report
npm run test:e2e         # Playwright e2e tests
```

## Architecture

Three HTML entry points, each with a corresponding ES module:

- `index.html` → `src/js/app.js`
- `start.html` → `src/js/start-app.js`
- `promotion.html` → `src/js/promotion-app.js`

Shared modules live in `src/js/shared/` (theme, profile, page transitions, UI utils, email utilities, signature generation, IndexedDB storage).

Profile data is stored in `localStorage` as JSON under key `userProfile`. All access goes through helper functions in `src/js/shared/profile.js`.

## Desktop App (Tauri)

```bash
npm run tauri:dev        # Tauri dev mode
npm run tauri:build      # Build desktop app
```

## Project Structure

```
src/
├── js/
│   ├── app.js                # Main template page entry
│   ├── start-app.js          # Profile setup page entry
│   ├── promotion-app.js      # Promotion page entry
│   ├── ui.js                 # Template generator UI
│   ├── templates.js          # Template definitions
│   └── shared/               # Shared utilities
│       ├── theme.js          # Theme/palette management
│       ├── profile.js        # Profile data access layer
│       ├── pageTransitions.js # Page transition animations
│       ├── ui-utils.js       # Toast notifications, OS detection
│       ├── db.js             # IndexedDB wrapper
│       ├── emailUtils.js     # EML/EMLTPL generation
│       ├── signature.js      # Email signature generation
│       └── ...
├── css/                      # Stylesheets (theme system)
index.html                    # Template generator page
start.html                    # Profile setup page
promotion.html                # Promotion email page
```

## Testing

- **Unit tests**: Vitest with jsdom (`npm run test`)
- **E2E tests**: Playwright (`npm run test:e2e`)
- Test files in `tests/` directory
