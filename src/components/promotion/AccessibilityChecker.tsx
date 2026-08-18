/**
 * AccessibilityChecker — Scans newsletter content for accessibility issues.
 *
 * Checks for:
 * - Images missing alt text
 * - Empty links (no text content)
 * - Heading hierarchy gaps (e.g., H2 → H4 skipping H3)
 * - Very long alt text (>125 chars)
 * - Missing language direction hints
 *
 * Manual, on-demand scan: results are a snapshot of the last scan and never
 * recompute as the user types. When the body changes after a scan the card
 * flags the results as stale, prompting a re-scan.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Link2Off,
  Heading,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore } from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// ===== Types =====

type IssueSeverity = 'error' | 'warning' | 'info';

interface A11yIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  message: string;
  element?: string;
}

// ===== Scanner =====

function scanHTML(html: string): A11yIssue[] {
  const issues: A11yIssue[] = [];
  let issueId = 0;

  // Parse with DOMParser
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // 1. Images missing alt text
  const images = doc.querySelectorAll('img');
  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === null || alt === undefined) {
      issues.push({
        id: String(++issueId),
        severity: 'error',
        category: 'Images',
        message: `Image missing alt attribute${img.src ? ` (src: …${img.src.slice(-30)})` : ''}`,
        element: 'img',
      });
    } else if (alt.trim() === '') {
      // Empty alt is valid for decorative images, but worth flagging
      issues.push({
        id: String(++issueId),
        severity: 'info',
        category: 'Images',
        message:
          'Image has empty alt text (decorative). Ensure this is intentional.',
        element: 'img',
      });
    } else if (alt.length > 125) {
      issues.push({
        id: String(++issueId),
        severity: 'warning',
        category: 'Images',
        message: `Alt text is very long (${alt.length} chars). Keep under 125 for screen readers.`,
        element: 'img',
      });
    }
  });

  // 2. Empty links
  const links = doc.querySelectorAll('a');
  links.forEach((a) => {
    const text = (a.textContent || '').trim();
    const hasImage = a.querySelector('img');
    const ariaLabel = a.getAttribute('aria-label');
    if (!text && !hasImage && !ariaLabel) {
      issues.push({
        id: String(++issueId),
        severity: 'error',
        category: 'Links',
        message: `Empty link with no text, image, or aria-label${a.href ? ` (href: ${a.href.slice(0, 40)})` : ''}`,
        element: 'a',
      });
    }
  });

  // 3. Heading hierarchy
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push({
        id: String(++issueId),
        severity: 'warning',
        category: 'Headings',
        message: `Heading level skipped: H${lastLevel} → H${level}. Use sequential levels for screen readers.`,
        element: h.tagName.toLowerCase(),
      });
    }
    if ((h.textContent || '').trim() === '') {
      issues.push({
        id: String(++issueId),
        severity: 'warning',
        category: 'Headings',
        message: `Empty ${h.tagName} heading found.`,
        element: h.tagName.toLowerCase(),
      });
    }
    lastLevel = level;
  });

  // 4. Tables without headers or summary
  const tables = doc.querySelectorAll('table');
  tables.forEach((table) => {
    const hasHeaders = table.querySelector('th');
    if (!hasHeaders && table.querySelectorAll('td').length > 2) {
      issues.push({
        id: String(++issueId),
        severity: 'info',
        category: 'Tables',
        message:
          'Data table has no header cells (<th>). Consider adding headers for screen readers.',
        element: 'table',
      });
    }
  });

  // 5. Text content checks
  const bodyText = doc.body?.textContent || '';
  if (bodyText.length > 0) {
    // Check for all-caps blocks (more than 50 consecutive uppercase chars)
    const allCapsMatch = bodyText.match(/[A-Z\s]{50,}/);
    if (allCapsMatch) {
      issues.push({
        id: String(++issueId),
        severity: 'info',
        category: 'Readability',
        message:
          'Long block of ALL CAPS text detected. This can be harder to read and may be read letter-by-letter by screen readers.',
      });
    }
  }

  return issues;
}

// ===== Severity Config =====

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { icon: typeof AlertTriangle; className: string; label: string }
> = {
  error: { icon: AlertTriangle, className: 'text-destructive', label: 'Error' },
  warning: {
    icon: AlertTriangle,
    className: 'text-warning',
    label: 'Warning',
  },
  info: { icon: Info, className: 'text-info', label: 'Info' },
};

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  Images: ImageOff,
  Links: Link2Off,
  Headings: Heading,
};

// ===== Component =====

export function AccessibilityChecker() {
  const store = usePromotionStore(
    useShallow((s) => ({
      newsletterBody: s.newsletterBody,
    }))
  );
  const [hasScanned, setHasScanned] = useState(false);
  // Results are a snapshot from the last manual scan; they intentionally do NOT
  // recompute as the user edits. `scannedBody` records exactly what was scanned
  // so we can flag when the content has drifted and a re-scan is warranted.
  const [issues, setIssues] = useState<A11yIssue[]>([]);
  const [scannedBody, setScannedBody] = useState('');

  const handleScan = () => {
    setIssues(scanHTML(store.newsletterBody));
    setScannedBody(store.newsletterBody);
    setHasScanned(true);
  };

  const isStale = hasScanned && store.newsletterBody !== scannedBody;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const hasContent =
    store.newsletterBody.trim() !== '' &&
    store.newsletterBody.trim() !== '<p></p>';

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Scan your newsletter content for common accessibility issues that may
        affect screen reader users and email clients.
      </p>

      {!hasContent ? (
        <p className="text-sm text-muted-foreground py-2">
          Add newsletter content first to run the accessibility scan.
        </p>
      ) : !hasScanned ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Button onClick={handleScan} size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Run Accessibility Scan
          </Button>
        </div>
      ) : (
        <>
          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <Button
              variant={isStale ? 'outline' : 'ghost'}
              size="sm"
              onClick={handleScan}
              className={cn(
                'gap-1.5 text-xs',
                isStale && 'border-warning/50 text-warning'
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-scan
            </Button>
            {isStale && (
              <span
                className="flex items-center gap-1 text-xs text-warning"
                data-testid="a11y-stale"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Edited since last scan
              </span>
            )}
            <div className="flex gap-1.5 ml-auto">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-warning/15 text-warning"
                >
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {infoCount} info
                </Badge>
              )}
            </div>
          </div>

          {/* Results */}
          {issues.length === 0 ? (
            <Alert variant="success">
              <CheckCircle2 />
              <AlertDescription>
                No accessibility issues found. Your content looks good!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-1.5" data-testid="a11y-issues-list">
              {issues.map((issue) => {
                const severityCfg = SEVERITY_CONFIG[issue.severity];
                const SeverityIcon = severityCfg.icon;
                const CategoryIcon = CATEGORY_ICONS[issue.category];

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      'flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs',
                      issue.severity === 'error' &&
                        'border-destructive/30 bg-destructive/5',
                      issue.severity === 'warning' &&
                        'border-warning/30 bg-warning/5',
                      issue.severity === 'info' && 'border-info/30 bg-info/5'
                    )}
                  >
                    <SeverityIcon
                      className={cn(
                        'h-3.5 w-3.5 mt-0.5 shrink-0',
                        severityCfg.className
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {CategoryIcon && (
                          <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="font-medium text-muted-foreground">
                          {issue.category}
                        </span>
                        {issue.element && (
                          <code className="text-[10px] bg-muted px-1 rounded">
                            &lt;{issue.element}&gt;
                          </code>
                        )}
                      </div>
                      <p>{issue.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
