# User Testing

Testing surface and validation infrastructure for the Promotion Page Layout Refactor mission.

## Validation Surface

**Surface:** Browser (web application)

**Tool:** agent-browser / Playwright

**Entry points:**
- Desktop layout: http://localhost:8080/promotion (viewport >= 1024px)
- Mobile layout: http://localhost:8080/promotion (viewport < 1024px)

**Profile seeding required** — inject via localStorage before navigating:
```js
localStorage.setItem("userProfile", JSON.stringify({name:"T",companyEmail:"t@c.com",storeName:"S",storeLocation:"L",storeAddress:"A",plusCode:"P",phone:"1",storeEmail:"s@c.com",storeHours:"H",storeDirections:"D"}));
```

**Playwright setup:**
- Chromium path: `/home/x/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
- Environment: `PLAYWRIGHT_BROWSERS_PATH=/home/x/.cache/ms-playwright`
- Use `{ force: true }` on clicks when layout elements overlap in multi-column views
- Dev server must be running: `npm run dev` (port 8080)

**Machine resources:** 7.7GB RAM, 8 CPU cores

## Validation Concurrency

**Max concurrent validators: 3**

Rationale: Each agent-browser instance uses ~300MB + dev server ~200MB = ~1.1GB for 3 validators. Available headroom ~5GB (7.7GB total - ~2.7GB baseline). Using 70% = 3.5GB. 3 validators at ~1.1GB = 3.3GB, within budget.

## Notes

- The app redirects to /start if no profile exists — always seed profile data before testing
- The promotion page uses IndexedDB for PDF storage — tests involving PDFs may need IndexedDB seeding
- Use `data-card-id` attributes to locate specific cards in the DOM
- The `ColumnState` type changed from `'left-expanded'|'center-expanded'` to `'left'|'center'` — update any test assertions referencing the old values
- Resize testing requires viewport manipulation — use Playwright's `page.setViewportSize()` for responsive tests
