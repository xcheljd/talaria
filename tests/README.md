# Testing

This project uses Vitest for unit testing with jsdom environment.

## Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with Vitest UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.js          # Test setup (mocks localStorage)
└── theme.test.js     # Theme system tests
```

## Coverage Areas

### Theme System (`theme.test.js`)

- **Palette validation**: Validates all 16 palettes (8 light, 8 dark)
- **Theme initialization**: Tests localStorage restoration and default values
- **Theme toggling**: Tests light/dark mode switching
- **Event dispatching**: Verifies `theme:changed` custom events
- **CSS generation**: Tests dark mode CSS and scrollbar CSS helpers
- **Migration behavior**: Tests invalid palette migration to 'github' fallback

### Current Coverage

- ✅ 26 tests passing
- ✅ All palette validation logic covered
- ✅ Theme state management covered
- ✅ localStorage persistence covered
- ⚠️ Visual pattern rendering requires manual verification (see below)

## Manual Visual Testing

Since CSS patterns are visual, they require manual verification. Use this checklist:

### Background Patterns Verification

For each of the 16 palettes (8 light + 8 dark):

1. **Light Mode Palettes:**
   - [ ] github - Diagonal stripes
   - [ ] spacegray - Dotted grid
   - [ ] catppuccin-latte - Small squares
   - [ ] nord - Horizontal lines
   - [ ] rose-pine-dawn - Diagonal dashes
   - [ ] tokyo-day - Small cross pattern
   - [ ] solarized - Diagonal wave
   - [ ] one-light - Chevron pattern

2. **Dark Mode Palettes:**
   - [ ] github - Diagonal stripes
   - [ ] spacegray - Dotted grid
   - [ ] catppuccin-mocha - Small squares
   - [ ] nord - Horizontal lines
   - [ ] rose-pine - Diagonal dashes
   - [ ] tokyo-night - Small cross pattern
   - [ ] monokai - Bold diagonal lines
   - [ ] kanagawa - Wave pattern

### Visual Testing Steps

1. Open `index.html` or `start.html`
2. Toggle theme switcher to dark mode
3. Select each palette from dropdowns (in Settings)
4. Verify pattern appears on background
5. Check pattern uses correct `--border` color from palette
6. Verify pattern is subtle (opacity ~0.25)

### Expected Behavior

- Pattern overlay uses `body::before` pseudo-element
- Pattern is fixed position covering entire viewport
- Pattern has `z-index: 9999` and `pointer-events: none`
- Pattern uses `--border` color variable for tinting
- Pattern opacity is ~0.25 (0.12 for github dark)

## Adding New Tests

When adding new features:

1. Create test file in `tests/` directory (e.g., `feature.test.js`)
2. Follow Vitest conventions (`describe`, `it`, `expect`)
3. Use global test utilities (available in jsdom environment)
4. Run `npm run test` to verify

## Test Environment

- **Runner**: Vitest v4.0.16
- **Environment**: jsdom (browser-like DOM)
- **Mocks**: localStorage is mocked for isolation

## Notes

- Tests are currently focused on theme logic and validation
- Visual regressions should be caught by manual testing checklist
- Consider adding Playwright for E2E visual regression testing in the future
