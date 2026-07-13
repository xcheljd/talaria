import { test, expect } from '@playwright/test';

test.describe('Palette Attributes', () => {
  test('sets light palette attribute', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('lightPalette', 'nord');
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-light-palette', 'nord');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('sets dark palette attribute', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('darkPalette', 'monokai');
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-dark-palette', 'monokai');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switches between palettes', async ({ page }) => {
    await page.goto('/index.html');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-light-palette', 'github');
    });

    const firstPalette = await page
      .locator('html')
      .getAttribute('data-light-palette');
    expect(firstPalette).toBe('github');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-light-palette', 'nord');
    });

    const secondPalette = await page
      .locator('html')
      .getAttribute('data-light-palette');
    expect(secondPalette).toBe('nord');
    expect(secondPalette).not.toBe(firstPalette);
  });
});

test.describe('CSS Variables', () => {
  test('reads --border color variable', async ({ page }) => {
    await page.goto('/index.html');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-light-palette', 'nord');
    });

    const borderColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--border')
        .trim();
    });

    // --border is registered via @property with syntax: '<color>' (src/index.css),
    // so the browser resolves it to a computed color and getPropertyValue returns
    // the serialized form (e.g. "rgb(216, 222, 233)"), not the authored hex
    // literal. Accept either serialization rather than pinning to one browser's
    // format.
    expect(borderColor).toMatch(
      /^(#[a-fA-F0-9]{6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\))$/
    );
  });

  test('reads --primary color variable', async ({ page }) => {
    await page.goto('/index.html');

    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
    });

    // See note above: --primary is also registered via @property as '<color>'.
    expect(primaryColor).toMatch(
      /^(#[a-fA-F0-9]{6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\))$/
    );
  });
});
