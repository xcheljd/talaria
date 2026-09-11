import { chromium } from 'playwright';

const url = 'http://localhost:5173';
const outDir = 'docs/screenshots';

// The promotion builder is behind a profile gate (PromotionPage redirects to
// /settings when localStorage has no `userProfile`). Seed a clearly fictional
// profile — example.com domains and 555 numbers only — so the capture shows
// the real builder instead of the redirect target.
const DEMO_PROFILE = {
  employeeName: 'Alex Rivera',
  // Must be one of JOB_TITLES (src/lib/profile-validation.ts) or the Settings
  // select renders blank; "General Manager" is the closest store-manager role.
  // It's a MANAGEMENT_TITLE, so companyEmail is required alongside it.
  jobTitle: 'General Manager',
  companyEmail: 'alex.rivera@solsticeoptics.example.com',
  companyName: 'Solstice Optics',
  storeName: 'Solstice Optics — Summerlin',
  storeLocation: 'Summerlin, Las Vegas, NV',
  storeAddress: '1980 Festival Plaza Dr, Las Vegas, NV 89135',
  storeDirections: 'Festival Plaza Dr, across from the Downtown Summerlin fountain',
  storePhone: '(702) 555-0187',
  storeEmail: 'hello@solsticeoptics.example.com',
  storeHours: 'Mon–Sat 10am–7pm, Sun 11am–5pm',
  productNoun: 'sunglass',
  productNounPlural: 'sunglasses',
  brandKeywords: ['Solstice', 'Polaré', 'Aviator Classic'],
  collectionKeywords: ['Coastal', 'Glacier', 'Sport'],
};

// A filled-in promotion so the builder screenshot shows a real email instead of
// the "Enter promotion details to see preview" placeholder. The shape is
// `PromotionPersistedState` (see persistState/restoreState in
// src/stores/promotion-store.ts); the preview only renders once
// `promoDateRange` is non-empty. `howToShopStyle`, `importantNotesStyle` and
// `emailPalette` are deliberately omitted — restoreState's sanitizer falls back
// to the app defaults, so the capture shows the stock palette.
//
// Everything here is invented: "Solstice Optics" and "Polaré" are not real
// brands, the address is a placeholder, phones are 555 and mail is .example.com.
const DEMO_PROMOTION = {
  promoDateRange: 'June 1 - 14',
  promoYear: '2026',
  promoTitle: 'Summer Shades Event',
  promotionEntries: [
    {
      id: 1,
      line: 'Polaré Aviator Classic — polarized, $129',
      collections: 'Coastal',
      callout: '2 for $180',
    },
    {
      id: 2,
      line: 'Solstice Glacier Shield — mirrored lens, $149',
      collections: 'Glacier',
      callout: '30% off',
    },
    {
      id: 3,
      line: 'Solstice Dune Runner — sport wrap, $119',
      collections: 'Sport',
      callout: 'Buy one, get one 50% off',
    },
    {
      id: 4,
      line: 'Polaré Harbor Round — gradient tint, $99',
      collections: 'Coastal',
      callout: 'Free lens care kit',
    },
    {
      id: 5,
      line: 'Solstice Summit Shield — photochromic, $169',
      collections: 'Glacier, Sport',
      callout: '$25 off',
    },
  ],
  specialHours: [{ id: 1, day: 'Saturday, June 6', hours: '9am – 8pm' }],
  // The `autoField` lines are regenerated from the profile on load
  // (refreshAutoLines), so the seeded text below is only a placeholder for the
  // rendered "Email …" / "Call … for availability" / "Find us at …" lines.
  howToShopItems: [
    {
      id: 1,
      text: 'Reply to this email to reserve a pair before the event.',
      bold: false,
      italic: false,
      underline: false,
    },
    {
      id: 2,
      text: 'Email hello@solsticeoptics.example.com',
      bold: false,
      italic: false,
      underline: false,
      autoField: 'storeEmail',
    },
    {
      id: 3,
      text: 'Call (702) 555-0187 for availability',
      bold: false,
      italic: false,
      underline: false,
      autoField: 'storePhone',
    },
  ],
  importantNotesItems: [
    {
      id: 1,
      text: 'Event pricing is in store only, June 1–14. Prescription lenses quoted separately.',
      bold: false,
      italic: false,
      underline: false,
    },
    {
      id: 2,
      text: 'Find us at Festival Plaza Dr',
      bold: false,
      italic: false,
      underline: false,
      autoField: 'storeDirections',
    },
  ],
  attachedPDFs: [],
  generatedSubjectLines: [
    'Summer Shades Event — polarized favorites, June 1-14',
    'Two weeks only: Solstice & Polaré at event pricing',
    'Coastal, Glacier & Sport — the Summer Shades Event starts June 1',
  ],
  selectedSubjectLine: 'Summer Shades Event — polarized favorites, June 1-14',
  preheaderText: 'Polarized favorites, event pricing',
  newsletterHeading: 'Newsletter',
  newsletterBody: '',
  newsletterPosition: 'top',
  newsletterVisible: false,
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
    // Seed the profile (opens the builder's gate) and the builder state (fills
    // the preview) for every navigation, so both captures tell the same
    // Solstice Optics story.
    await context.addInitScript((seed) => {
      localStorage.setItem('userProfile', JSON.stringify(seed.profile));
      localStorage.setItem(
        'promotionBuilderState',
        JSON.stringify(seed.promotion)
      );
    }, { profile: DEMO_PROFILE, promotion: DEMO_PROMOTION });

    await capture('/settings', 'profile-settings.png');

    await capture('/promotion', 'promotion-builder.png');
    if (!page.url().includes('/promotion')) {
      throw new Error(
        'Profile gate still closed: /promotion redirected to ' +
          page.url() +
          ' — the seeded `userProfile` localStorage key was not picked up.'
      );
    }

    // The preview iframe renders a placeholder until the store hydrates a
    // non-empty promoDateRange — assert we captured a real email, not that.
    const previewText = await page
      .frameLocator('iframe')
      .first()
      .locator('body')
      .innerText();
    if (previewText.includes('Enter promotion details to see preview')) {
      throw new Error(
        'Preview still empty: the seeded `promotionBuilderState` did not hydrate ' +
          '— check it against PromotionPersistedState in src/stores/promotion-store.ts.'
      );
    }
    if (!previewText.includes('SOLSTICE OPTICS')) {
      throw new Error(
        'Preview rendered without the seeded store name; got: ' +
          previewText.slice(0, 200)
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
