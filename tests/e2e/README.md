# Playwright End-to-End Tests

Tests that verify background patterns render correctly across all 16 palettes.

## Running Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run with UI (headed mode with inspector)
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed
```

## What Gets Tested

### 1. Pattern Rendering (All 16 Palettes)

- ✅ Background pattern exists (via `body::before` pseudo-element)
- ✅ Pattern has correct opacity (0.25, or 0.12 for github dark)
- ✅ Pattern has correct z-index (9999)
- ✅ Pattern is fixed position
- ✅ Pattern uses background-image (not 'none')

### 2. Palette Attribute Verification

- ✅ `data-light-palette` attribute set correctly
- ✅ `data-dark-palette` attribute set correctly

### 3. Color Variable Usage

- ✅ Pattern uses `--border` CSS variable from palette
- ✅ Color is valid hex format

### 4. Dynamic Behavior

- ✅ Pattern changes when palette is switched
- ✅ GitHub dark uses lower opacity (0.12) vs light mode (0.25)
- ✅ Different gradient types verified (radial, linear, repeating-linear)

### 5. Visual Regression (Optional)

- Screenshots saved to `tests/e2e/screenshots/`
- Can be used with visual regression tools

## How Playwright "Sees" Patterns

Since patterns use CSS pseudo-elements (`body::before`), Playwright:

✅ **CAN** check:

- Computed styles via `getComputedStyle(body, '::before')`
- Background-image gradient strings
- Opacity, z-index, position values
- CSS custom properties (`--border`)
- Attribute values on HTML element

❌ **CANNOT** directly:

- Query pseudo-elements via `querySelector('body::before')`
- See pseudo-elements in DOM tree
- Interact with pseudo-elements directly

## Example Test Output

```bash
$ npm run test:e2e

Running 18 tests using 3 workers

  ✓  github displays github pattern
  ✓  spacegray displays spacegray pattern
  ✓  nord displays nord pattern
  ✓  pattern uses --border color variable
  ✓  pattern changes when palette is switched
  ✓  github dark uses different opacity

  18 passed (5.2s)
```

## Debugging

Run tests with browser visible:

```bash
# See what's happening
npm run test:e2e:headed

# With interactive UI for debugging
npm run test:e2e:ui
```

## Coverage

Currently tests:

- ✅ All 16 palettes (8 light + 8 dark)
- ✅ Pattern rendering mechanics
- ✅ CSS variable integration
- ⚠️ Visual appearance (requires manual verification of screenshots)

## Adding New Pattern Tests

To test a new palette:

1. Add palette name to arrays in test file
2. Write test case (or let loop handle it)
3. Verify gradient type if different from existing
4. Run `npm run test:e2e`

For visual regression:

```javascript
test('new-pattern visual check', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-light-palette', 'new-palette');
  });
  await page.screenshot({ path: 'new-pattern.png' });
});
```
