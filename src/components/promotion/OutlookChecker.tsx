/**
 * OutlookChecker — Rule-based scanner for known Outlook rendering issues.
 *
 * Scans the generated email HTML for patterns that cause problems
 * in Outlook (Word rendering engine). Reports issues with severity
 * and recommendations.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore } from '@/stores/promotion-store';
import { generatePromotionEmailHTML } from '@/lib/promotion-email-html';
import { buildPromotionEmailData } from '@/lib/newsletter-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ===== Types =====

type IssueSeverity = 'error' | 'warning' | 'info';

interface OutlookIssue {
  id: string;
  severity: IssueSeverity;
  rule: string;
  message: string;
  recommendation: string;
}

// ===== Rules =====

interface Rule {
  id: string;
  name: string;
  severity: IssueSeverity;
  check: (html: string, doc: Document) => string | null;
  recommendation: string;
}

const OUTLOOK_RULES: Rule[] = [
  {
    id: 'css-float',
    name: 'CSS float',
    severity: 'error',
    check: (html) =>
      /float\s*:\s*(left|right)/i.test(html)
        ? 'CSS float detected. Outlook ignores float — use table-based layout instead.'
        : null,
    recommendation:
      'Replace float layouts with <table> cells for Outlook compatibility.',
  },
  {
    id: 'css-flexbox',
    name: 'Flexbox',
    severity: 'error',
    check: (html) =>
      /display\s*:\s*flex/i.test(html)
        ? 'Flexbox detected. Outlook does not support display:flex.'
        : null,
    recommendation:
      'Use <table> layouts instead of flexbox for email structure.',
  },
  {
    id: 'css-grid',
    name: 'CSS Grid',
    severity: 'error',
    check: (html) =>
      /display\s*:\s*grid/i.test(html)
        ? 'CSS Grid detected. Outlook does not support display:grid.'
        : null,
    recommendation: 'Use <table> layouts instead of CSS Grid.',
  },
  {
    id: 'css-position',
    name: 'CSS position',
    severity: 'warning',
    check: (html) =>
      /position\s*:\s*(absolute|fixed|sticky)/i.test(html)
        ? 'CSS position (absolute/fixed/sticky) detected. Outlook ignores these.'
        : null,
    recommendation: 'Avoid positioned elements. Use table cells for alignment.',
  },
  {
    id: 'background-image',
    name: 'Background images',
    severity: 'warning',
    check: (html) =>
      /background-image\s*:/i.test(html) || /background\s*:.*url\(/i.test(html)
        ? 'CSS background-image detected. Outlook requires VML fallback for background images.'
        : null,
    recommendation:
      'Use <img> tags instead, or add VML conditional comments for Outlook.',
  },
  {
    id: 'margin-auto',
    name: 'margin: auto centering',
    severity: 'warning',
    check: (html) =>
      /margin\s*:\s*[^;]*auto/i.test(html)
        ? 'margin:auto detected. Outlook may not center elements with auto margins.'
        : null,
    recommendation:
      'Use align="center" on table cells, or wrap in a centered <table>.',
  },
  {
    id: 'max-width',
    name: 'max-width',
    severity: 'info',
    check: (html) =>
      /max-width\s*:/i.test(html)
        ? 'max-width detected. Outlook ignores max-width on most elements.'
        : null,
    recommendation:
      'Set explicit width instead. Use conditional comments for Outlook-specific widths.',
  },
  {
    id: 'border-radius',
    name: 'border-radius',
    severity: 'info',
    check: (html) =>
      /border-radius\s*:/i.test(html)
        ? 'border-radius detected. Outlook renders square corners (border-radius is ignored).'
        : null,
    recommendation:
      'Acceptable for progressive enhancement. Corners will be square in Outlook.',
  },
  {
    id: 'padding-block',
    name: 'Padding on block elements',
    severity: 'warning',
    check: (_html, doc) => {
      const divs = doc.querySelectorAll(
        'div[style*="padding"], p[style*="padding"]'
      );
      return divs.length > 5
        ? `${divs.length} block elements with padding found. Outlook may inconsistently apply padding on <div> and <p>.`
        : null;
    },
    recommendation:
      'Use padding on <td> cells instead. Outlook handles table cell padding more reliably.',
  },
  {
    id: 'large-images',
    name: 'Large embedded images',
    severity: 'warning',
    check: (html) => {
      const base64Matches = html.match(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/=]{50000,}/g
      );
      if (base64Matches && base64Matches.length > 0) {
        const totalKB = Math.round(
          base64Matches.reduce((sum, m) => sum + m.length, 0) / 1024
        );
        return `${base64Matches.length} large base64 image(s) detected (~${totalKB}KB). Outlook may clip emails over 100KB.`;
      }
      return null;
    },
    recommendation:
      'Host images externally and use <img src="https://..."> instead of base64 embedding.',
  },
  {
    id: 'semantic-tags',
    name: 'Semantic HTML tags',
    severity: 'info',
    check: (_html, doc) => {
      const semanticTags = [
        'article',
        'section',
        'nav',
        'header',
        'footer',
        'main',
        'aside',
      ];
      const found = semanticTags.filter(
        (tag) => doc.querySelectorAll(tag).length > 0
      );
      return found.length > 0
        ? `Semantic tags found: <${found.join('>, <')}>. Some Outlook versions ignore these.`
        : null;
    },
    recommendation:
      'Use <div> and <table> instead of semantic tags for maximum Outlook compatibility.',
  },
  {
    id: 'svg',
    name: 'SVG elements',
    severity: 'error',
    check: (html) =>
      /<svg[\s>]/i.test(html)
        ? 'SVG element detected. Outlook does not render inline SVG.'
        : null,
    recommendation: 'Convert SVG to PNG/JPG and use <img> tags instead.',
  },
  {
    id: 'form-elements',
    name: 'Form elements',
    severity: 'error',
    check: (_html, doc) => {
      const forms = doc.querySelectorAll(
        'form, input, select, textarea, button'
      );
      return forms.length > 0
        ? `${forms.length} form element(s) found. Outlook strips form elements from emails.`
        : null;
    },
    recommendation:
      'Remove form elements. Use links to external forms instead.',
  },
  {
    id: 'video-audio',
    name: 'Video/Audio',
    severity: 'error',
    check: (_html, doc) => {
      const media = doc.querySelectorAll('video, audio, iframe');
      return media.length > 0
        ? 'Media elements (<video>, <audio>, <iframe>) detected. Outlook blocks these.'
        : null;
    },
    recommendation:
      'Use a static image with a play button linking to the hosted video.',
  },
  {
    id: 'total-size',
    name: 'Email total size',
    severity: 'warning',
    check: (html) => {
      const sizeKB = Math.round(html.length / 1024);
      return sizeKB > 100
        ? `Email HTML is ~${sizeKB}KB. Outlook and Gmail clip emails over ~102KB.`
        : null;
    },
    recommendation:
      'Reduce HTML size by removing unnecessary whitespace, comments, and hosting images externally.',
  },
];

// ===== Severity Config =====

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { icon: typeof AlertTriangle; className: string }
> = {
  error: { icon: ShieldAlert, className: 'text-destructive' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  info: { icon: Info, className: 'text-blue-500' },
};

// ===== Component =====

export function OutlookChecker() {
  const store = usePromotionStore(
    useShallow((s) => ({
      promoDateRange: s.promoDateRange,
    }))
  );
  const [hasScanned, setHasScanned] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(0);
  const [emailHTML, setEmailHTML] = useState('');

  // Reads full state at scan time instead of subscribing to every field —
  // this component only re-renders when promoDateRange changes.
  const generateHTML = useCallback((): string => {
    const s = usePromotionStore.getState();
    if (!s.promoDateRange) return '';
    return generatePromotionEmailHTML(buildPromotionEmailData(s));
  }, []);

  const issues = useMemo(() => {
    if (!hasScanned || !emailHTML) return [];

    const doc = new DOMParser().parseFromString(emailHTML, 'text/html');
    const found: OutlookIssue[] = [];
    let issueId = 0;

    for (const rule of OUTLOOK_RULES) {
      const result = rule.check(emailHTML, doc);
      if (result) {
        found.push({
          id: String(++issueId),
          severity: rule.severity,
          rule: rule.name,
          message: result,
          recommendation: rule.recommendation,
        });
      }
    }

    return found;
    // scanTrigger is intentionally a dependency: it forces a re-scan when the
    // user clicks Scan again even if emailHTML hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScanned, scanTrigger, emailHTML]);

  const handleScan = () => {
    setEmailHTML(generateHTML());
    setHasScanned(true);
    setScanTrigger((n) => n + 1);
  };

  const hasContent = !!store.promoDateRange;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Scan your generated email for known Outlook rendering issues. Outlook
        uses the Word engine which has limited CSS support.
      </p>

      {!hasContent ? (
        <p className="text-sm text-muted-foreground py-2">
          Add a date range first to generate email content for scanning.
        </p>
      ) : !hasScanned ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Button onClick={handleScan} size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Scan for Outlook Issues
          </Button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScan}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-scan
            </Button>
            <div className="flex gap-1.5 ml-auto">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
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
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                No Outlook compatibility issues found!
              </p>
            </div>
          ) : (
            <div className="space-y-1.5" data-testid="outlook-issues-list">
              {issues.map((issue) => {
                const severityCfg = SEVERITY_CONFIG[issue.severity];
                const SeverityIcon = severityCfg.icon;

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      'rounded-md border px-2.5 py-2 text-xs',
                      issue.severity === 'error' &&
                        'border-destructive/30 bg-destructive/5',
                      issue.severity === 'warning' &&
                        'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-950/20',
                      issue.severity === 'info' &&
                        'border-blue-200/50 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon
                        className={cn(
                          'h-3.5 w-3.5 mt-0.5 shrink-0',
                          severityCfg.className
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium mb-0.5">{issue.rule}</p>
                        <p className="text-muted-foreground">{issue.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80 italic">
                          Fix: {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Size info */}
          {emailHTML && (
            <p className="text-[10px] text-muted-foreground text-right">
              Email size: ~{Math.round(emailHTML.length / 1024)}KB ·{' '}
              {OUTLOOK_RULES.length} rules checked
            </p>
          )}
        </>
      )}
    </div>
  );
}
