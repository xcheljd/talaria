# User Testing

Testing surface and validation infrastructure for the Error Boundaries mission.

## Validation Surface

**Surface:** Browser (web application)

**Tool:** agent-browser

**Entry points:**
- http://localhost:8080/ — TemplatesPage
- http://localhost:8080/start — ProfilePage
- http://localhost:8080/promotion — PromotionPage
- http://localhost:8080/components — ComponentsShowcase

**Dev server:** `npm run dev` (port 8080)

**No profile seeding needed** for error boundary testing — boundaries are tested by forcing render errors, not by exercising page functionality.

**To force a render error for testing:**
- Temporarily add `throw new Error('test boundary')` to a page component's render method
- Or create a test component that conditionally throws based on a flag

**To test theme compatibility:**
- Toggle theme via the ThemeToggle button in the nav header
- Verify error boundary fallback colors change with the theme

## Validation Concurrency

**Max concurrent validators:** 2

**Rationale:** Machine has ~2.5 GB available RAM. Each agent-browser instance ~300 MB, dev server ~200 MB. 2 concurrent instances = ~800 MB total, within 70% headroom budget of ~1.75 GB.
