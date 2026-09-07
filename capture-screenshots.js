import { chromium } from 'playwright';

const url = 'http://localhost:5173';
const outDir = 'docs/screenshots';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const screenshots = [];
  
  const pages = [
    { path: '/promotion', name: 'promotion-builder.png', label: 'Promotion Email Builder' },
    { path: '/settings', name: 'profile-settings.png', label: 'Profile Settings' },
  ];
  
  for (const p of pages) {
    try {
      await page.goto(url + p.path);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: outDir + '/' + p.name, fullPage: false });
      screenshots.push(p.name);
      console.log('Captured: ' + p.name);
    } catch (e) {
      console.error('Error capturing ' + p.name + ': ' + e.message);
    }
  }
  
  await browser.close();
  console.log('Done: ' + screenshots.join(', '));
})();
