import { test, expect } from '@playwright/test';

test.describe('Palette Attributes', () => {
  test('sets light palette attribute', async ({ page }) => {
    await page.goto('/index.html');

    await page.evaluate((p) => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-light-palette', p);
    }, 'nord');

    const paletteAttr = await page
      .locator('html')
      .getAttribute('data-light-palette');
    expect(paletteAttr).toBe('nord');

    const themeAttr = await page.locator('html').getAttribute('data-theme');
    expect(themeAttr).toBe('light');
  });

  test('sets dark palette attribute', async ({ page }) => {
    await page.goto('/index.html');

    await page.evaluate((p) => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-dark-palette', p);
    }, 'monokai');

    const paletteAttr = await page
      .locator('html')
      .getAttribute('data-dark-palette');
    expect(paletteAttr).toBe('monokai');

    const themeAttr = await page.locator('html').getAttribute('data-theme');
    expect(themeAttr).toBe('dark');
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

    expect(borderColor).toMatch(/^#[a-fA-F0-9]{6}$/);
  });

  test('reads --primary color variable', async ({ page }) => {
    await page.goto('/index.html');

    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
    });

    expect(primaryColor).toMatch(/^#[a-fA-F0-9]{6}$/);
  });
});
