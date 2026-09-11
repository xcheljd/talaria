import { chromium } from 'playwright';

const url = 'http://localhost:5173';
const outDir = 'docs/screenshots';

// The promotion builder is behind a profile gate (PromotionPage redirects to
// /settings when localStorage has no `userProfile`). Seed a clearly fictional
// profile — example.com domains and 555 numbers only — so the capture shows
// the real builder instead of the redirect target.
const DEMO_PROFILE = {
  employeeName: 'Alex Rivera',
  jobTitle: 'Store Manager',
  companyName: 'Horology Retail Group',
  storeName: 'Riverside Watches',
  storeLocation: 'Las Vegas, NV',
  storeAddress: '1231 Main St, Las Vegas, NV 89101',
  storePhone: '(702) 555-0142',
  storeEmail: 'riverside@horologyexample.com',
  storeHours: 'Mon–Sat 10am–7pm, Sun 11am–6pm',
  productNoun: 'watch',
  productNounPlural: 'watches',
  brandKeywords: ['Riverside'],
  collectionKeywords: ['Aria', 'Meridian'],
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const screenshots = [];

  const capture = async (path, name) => {
    await page.goto(url + path);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: outDir + '/' + name, fullPage: false });
    screenshots.push(name);
    console.log('Captured: ' + name + ' (url: ' + page.url() + ')');
  };

  try {
    // Settings first, with no profile seeded yet — the empty default page is
    // the honest picture of a fresh install.
    await capture('/settings', 'profile-settings.png');

    // Seed the profile for every subsequent navigation, then capture the
    // builder now that the gate opens.
    await context.addInitScript((profile) => {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    }, DEMO_PROFILE);

    await capture('/promotion', 'promotion-builder.png');
    if (!page.url().includes('/promotion')) {
      throw new Error(
        'Profile gate still closed: /promotion redirected to ' +
          page.url() +
          ' — the seeded `userProfile` localStorage key was not picked up.'
      );
    }
  } finally {
    await browser.close();
  }

  console.log('Done: ' + screenshots.join(', '));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
