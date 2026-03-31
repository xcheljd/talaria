# User Testing

Testing surface and validation infrastructure for the Newsletter Card with TipTap mission.

## Validation Surface

**Surface:** Browser (web application)

**Tool:** agent-browser / Playwright

**Entry points:**
- Desktop layout: http://localhost:8080/promotion (viewport >= 1024px)
- Mobile layout: http://localhost:8080/promotion (viewport < 1024px)

**Profile seeding required** — inject via localStorage before navigating:
```js
localStorage.setItem("userProfile", JSON.stringify({firstName:"Test",lastName:"User",email:"t@t.com",storeNumber:"1",storeName:"S",jobTitle:"Manager",companyEmail:"s@t.com",phone:"555-1234"}));
```

**Playwright setup:**
- Chromium path: `/home/x/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
- Environment: `PLAYWRIGHT_BROWSERS_PATH=/home/x/.cache/ms-playwright`
- Dev server must be running: `npm run dev` (port 8080)

## Newsletter Card Testing Specifics

- TipTap editor requires real DOM (jsdom sufficient for component tests)
- Newsletter card: `data-card-id="newsletterCard"`
- Icon toolbar newsletter button: `data-testid="toolbar-icon-newsletterCard"`
- Editor toolbar buttons are standard HTML buttons within the TipTap toolbar
- Email preview updates reactively via useMemo

## Validation Concurrency

**Max concurrent validators: 3**
- Each agent-browser instance: ~300MB RAM
- Dev server: ~200MB RAM
- Machine: 7.7GB RAM, 8 cores
- Usable headroom: ~5GB * 0.7 = ~3.5GB
- 3 validators = ~1.1GB (fits)

## TipTap Editor Access

- TipTap editor instance is NOT accessible via `.tiptap` CSS class or React fiber
- Access via: `document.querySelector('.ProseMirror').editor` to get the TipTap editor API
- Use `editor.commands.setContent()` to programmatically set editor content for testing
- Use `editor.getHTML()` to get current editor HTML for verification

## HTML Code Tab

- HTML Code tab content is only in DOM when the tab is selected
- Switch to Preview tab makes the HTML panel invisible to querySelector
- Always ensure HTML Code tab is selected before extracting HTML content

## Position Toggle Buttons

- Position toggle buttons use `aria-label` attributes ("Position: Top", "Position: Bottom")
- Interact via: `find role button --name 'Position: Top'` / `--name 'Position: Bottom'`

## EML File Capture

- agent-browser `--download-path` cannot be changed mid-session when daemon is running
- Use a JavaScript Blob constructor interceptor to capture EML content on download
- Then extract captured content via browser_evaluate

## Flow Validator Guidance: browser

All browser-based validators share the same dev server (port 8080). Isolation is via separate browser sessions. No shared mutable state conflicts — validators are read-only tests against the same running app instance. Each validator must seed its own profile via localStorage in its own session.

## Notes

- App redirects to /start if no profile — always seed profile data
- Promotion page uses IndexedDB for state persistence
- Use `data-card-id` attributes to locate cards
- Resize testing: use Playwright `page.setViewportSize()`
- Mock `IntersectionObserver` in tests involving icon toolbar or scroll spy
