# Validation Contract — Email Integration
## Newsletter Card with TipTap Rich Text Editor

---

### VAL-EMAIL-001: Newsletter rendered at TOP position in email preview

When the newsletter position is set to "top" and the newsletter body contains content, the email preview iframe renders the newsletter section between the HEADER row and the BRAND SECTIONS. The section order must be: HEADER → NEWSLETTER → BRAND SECTIONS → HOW TO SHOP BOX → IMPORTANT NOTES BOX → FOOTER → UNSUBSCRIBE. The newsletter section must be visually distinct (e.g., bordered or shaded container) in the preview.

Tool: agent-browser
Evidence: screenshot of email preview showing newsletter at top position, console-errors

---

### VAL-EMAIL-002: Newsletter rendered at BOTTOM position in email preview

When the newsletter position is set to "bottom" and the newsletter body contains content, the email preview iframe renders the newsletter section between the BRAND SECTIONS and the HOW TO SHOP BOX. The section order must be: HEADER → BRAND SECTIONS → NEWSLETTER → HOW TO SHOP BOX → IMPORTANT NOTES BOX → FOOTER → UNSUBSCRIBE.

Tool: agent-browser
Evidence: screenshot of email preview showing newsletter at bottom position, console-errors

---

### VAL-EMAIL-003: Newsletter heading appears in email HTML

When the newsletter heading field is set to a custom value (e.g., "Store Updates") and the newsletter body has content, the generated email HTML contains an element with the heading text. The heading must be rendered as an inline-styled HTML element (e.g., `<h2>` or `<p>` with `style` attribute containing font-family, font-size, and margin) matching the email template's visual style. When the heading field is left at its default ("Newsletter"), the email HTML contains "Newsletter" as the section heading.

Tool: agent-browser
Evidence: screenshot of email HTML code tab showing heading element, console-errors

---

### VAL-EMAIL-004: Newsletter body content appears in email HTML with inline styles

When the newsletter body contains TipTap-generated HTML (paragraphs, lists, bold/italic text), the generated email HTML includes the body content with all CSS converted to inline `style` attributes on each element. No `<style>` blocks or external class references for newsletter body styles are present — every visual property must be expressed as inline styles (e.g., `style="font-weight: bold; font-style: italic; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;"`). This ensures email client compatibility.

Tool: agent-browser
Evidence: screenshot of email HTML code tab showing inline-styled newsletter body, console-errors

---

### VAL-EMAIL-005: Empty newsletter does not render a section in the email

When the newsletter body is empty (no content entered in the TipTap editor, or only whitespace/default empty paragraph), the generated email HTML does not contain any newsletter section markup. No heading, no container div, and no empty section placeholder appears in the email HTML between the expected section boundaries. The email reverts to the standard layout without a newsletter gap.

Tool: agent-browser
Evidence: screenshot of email HTML code tab confirming no newsletter section, screenshot of email preview, console-errors

---

### VAL-EMAIL-006: Changing newsletter content updates the live preview

When the user edits the newsletter body content in the TipTap editor (e.g., types new text, applies formatting), the email preview iframe updates to reflect the changes without requiring a manual refresh or button click. The preview must show the updated content within the debounce interval (≤500ms). This applies to both body content changes and heading changes.

Tool: agent-browser
Evidence: screenshot of editor with typed content, screenshot of updated preview, console-errors

---

### VAL-EMAIL-007: Newsletter data included in JSON export

When the user clicks the Export button, the downloaded JSON file contains newsletter-related fields: `newsletterHeading` (string), `newsletterBody` (string containing TipTap HTML), and `newsletterPosition` (string: "top" or "bottom"). These fields appear at the top level of the exported config object alongside existing fields like `dateRange`, `promotionEntries`, etc. The JSON is valid and parseable.

Tool: agent-browser
Evidence: screenshot of downloaded JSON file contents, console-errors

---

### VAL-EMAIL-008: Newsletter data restored from JSON import

When the user imports a JSON config file that contains `newsletterHeading`, `newsletterBody`, and `newsletterPosition` fields, the promotion store is updated with these values. The TipTap editor displays the imported body content, the heading field shows the imported heading, the position selector reflects the imported position, and the email preview regenerates using the imported newsletter data. If the imported JSON lacks newsletter fields, the store defaults to empty body, default heading ("Newsletter"), and default position ("top") — no errors occur.

Tool: agent-browser
Evidence: screenshot of imported state in editor, screenshot of regenerated preview, console-errors

---

### VAL-EMAIL-009: Newsletter data included in EML file generation

When the user downloads an EML email draft, the generated EML file's HTML body contains the newsletter section rendered at the configured position with inline styles. The EML file is RFC 5322/2045 compliant (CRLF line endings, proper MIME boundaries, correct Content-Transfer-Encoding). The newsletter content is embedded in the `text/html` MIME part alongside the existing promotion email sections.

Tool: agent-browser
Evidence: screenshot of EML file HTML content, console-errors

---

### VAL-EMAIL-010: Formatted text renders correctly in the email HTML

When the newsletter body contains rich text formatting applied via TipTap — specifically bold (`<strong>`), italic (`<em>`), underline (`<u>`), text color (`style="color: #ff0000"`), highlight/background color (`style="background-color: #ffff00"`), headings (`<h2>`), bullet lists (`<ul><li>`), and links (`<a href="...">`) — each element appears in the generated email HTML with equivalent inline styles. Bold maps to `font-weight: bold`, italic to `font-style: italic`, underline to `text-decoration: underline`, colors to `color:` inline style, and links retain `href` with inline color styling matching the email template palette.

Tool: agent-browser
Evidence: screenshot of email HTML code tab showing formatted elements with inline styles, screenshot of email preview rendering formatted text, console-errors

---

### VAL-EMAIL-011: XSS — malicious HTML in newsletter body is sanitized in email output

When the newsletter body HTML contains malicious content — such as `<script>alert('xss')</script>`, `<img src=x onerror=alert(1)>`, `<a href="javascript:alert(1)">`, `<svg onload=alert(1)>`, or event handler attributes (`onclick`, `onload`, `onerror`) — the generated email HTML strips or neutralizes all dangerous elements and attributes. The output must not contain any `<script>` tags, `javascript:` URIs, or `on*` event handler attributes. Only safe HTML elements and inline style attributes are preserved. The `sanitizeHTML()` function from `html-utils` or equivalent DOM-based sanitization must be applied to the newsletter body before it is injected into the email template.

Tool: agent-browser
Evidence: screenshot of email HTML code tab showing sanitized output, console-errors confirming no script execution
