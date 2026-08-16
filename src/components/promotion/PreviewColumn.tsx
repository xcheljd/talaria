/**
 * PreviewColumn — the right-hand pane of the promotion builder: live email
 * preview (desktop/mobile, light/dark) and the HTML source tab.
 *
 * Presentation + wiring only. The controls row, the two action dialogs, and the
 * import/export/download/print/generate logic live in sibling modules:
 *   - PreviewToolbar         (controls row)
 *   - ExportOptionsDialog    (export options)
 *   - GenerateWarningDialog  (pre-generate warning)
 *   - usePreviewActions      (the actions + their dialog state)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Mail,
  FileDown,
  FileCode,
  Download,
  Upload,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore } from '@/stores/promotion-store';
import {
  applyDarkModeToDocument,
  type DarkModeStyle,
} from '@/lib/promotion-email-html';
import { StorageKeys } from '@/lib/storage-keys';
import { useTheme } from '@/contexts/ThemeProvider';
import { usePreviewThemeSync } from '@/hooks/usePreviewThemeSync';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useDevMode } from '@/hooks/useDevMode';
import { PreviewToolbar } from './PreviewToolbar';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { GenerateWarningDialog } from './GenerateWarningDialog';
import { usePreviewActions, selectPreviewStore } from './usePreviewActions';

// ===== Preview Column Component =====

const PREVIEW_PLACEHOLDER_HTML = `<html><body style="display:flex;align-items:center;justify-content:center;min-height:400px;font-family:system-ui,sans-serif;color:#888;"><p style="text-align:center;">Enter promotion details to see preview</p></body></html>`;

export function PreviewColumn({ emailHTML }: { emailHTML: string }) {
  const { devMode } = useDevMode();
  const store = usePromotionStore(useShallow(selectPreviewStore));

  const actions = usePreviewActions(emailHTML, store);

  // App theme + the per-user "follow the app theme" preference. When syncing is
  // on, the preview's light/dark is driven by `theme` (single source of truth)
  // and the preview toggle flips the app theme so the two move together; when
  // off, the preview uses its own persisted `previewDark` below.
  const { theme, setTheme } = useTheme();
  const { syncPreviewTheme } = usePreviewThemeSync();

  const [activeTab, setActiveTab] = useState('preview');
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>(
    'desktop'
  );
  // Light/dark and full/partial are persisted (see StorageKeys.preview*) so the
  // chosen preview mode is remembered across app sessions; lazily seeded from
  // localStorage and written back in the change handlers below.
  const [previewDark, setPreviewDark] = useState(
    () => localStorage.getItem(StorageKeys.previewDark) === 'true'
  );
  // What the preview actually renders: the app theme while linked, else the
  // preview's own toggle.
  const effectiveDark = syncPreviewTheme ? theme === 'dark' : previewDark;
  // Which client dark-mode model to emulate: 'full' inverts every color
  // (Outlook Windows, Gmail iOS); 'partial' only darkens light backgrounds and
  // lightens dark text/borders, leaving already-dark areas (Gmail mobile,
  // Outlook.com). See applyDarkModeToDocument.
  const [previewInversion, setPreviewInversion] = useState<DarkModeStyle>(() =>
    localStorage.getItem(StorageKeys.previewInversion) === 'partial'
      ? 'partial'
      : 'full'
  );

  // The iframe always renders the LIGHT html. Dark mode is applied to the live
  // document in place (see applyMode) rather than by swapping srcDoc, so
  // toggling light/dark or full/partial never reloads the iframe — which is what
  // preserves the scroll position (a reload resets it, most visibly in
  // WebKit/WKWebView). The srcDoc therefore changes only when the email content
  // itself changes, not on a mode switch.
  const previewHTML = emailHTML || PREVIEW_PLACEHOLDER_HTML;

  const hasContent = !!emailHTML;

  const handleViewportChange = useCallback((v: string) => {
    if (v === 'desktop' || v === 'mobile') setPreviewWidth(v);
  }, []);

  const handleThemeChange = useCallback(
    (v: string) => {
      if (v !== 'light' && v !== 'dark') return;
      const dark = v === 'dark';
      if (syncPreviewTheme) {
        // While linked, the toggle is really an app-theme switch — drive it so
        // the app and preview move together (effectiveDark follows `theme`, and
        // the effect below mirrors it into the persisted independent value).
        setTheme(dark ? 'dark' : 'light');
      } else {
        setPreviewDark(dark);
        localStorage.setItem(StorageKeys.previewDark, String(dark));
      }
    },
    [syncPreviewTheme, setTheme]
  );

  // While linked, mirror the app theme into the persisted independent value so
  // that turning sync off later (in Settings) leaves the preview exactly where
  // it is on screen, rather than snapping to a stale previewDark.
  useEffect(() => {
    if (!syncPreviewTheme) return;
    const dark = theme === 'dark';
    setPreviewDark(dark);
    localStorage.setItem(StorageKeys.previewDark, String(dark));
  }, [syncPreviewTheme, theme]);

  const handleInversionChange = useCallback((v: string) => {
    if (v !== 'full' && v !== 'partial') return;
    setPreviewInversion(v);
    localStorage.setItem(StorageKeys.previewInversion, v);
  }, []);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollPosRef = useRef(0);

  // Recolor the live preview document for the active mode, in place. This never
  // reloads the iframe, so the scroll position is untouched when toggling.
  const applyMode = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    applyDarkModeToDocument(doc, effectiveDark ? previewInversion : 'light');
  }, [effectiveDark, previewInversion]);

  // Re-apply whenever the model changes (no reload → scroll preserved).
  useEffect(() => {
    applyMode();
  }, [applyMode]);

  const handleIframeLoad = useCallback(() => {
    // A reload (content edit / first mount) brings back the light DOM — re-apply
    // the active mode, then restore the scroll position.
    applyMode();

    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Reapply the saved offset to the freshly loaded document, using the
    // window scroll API (engine-agnostic — avoids scrollingElement/body quirks).
    // WebKit (Tauri's WKWebView) frequently hasn't laid the new srcDoc out yet
    // at load time, so a single scrollTo clamps to the top; retry across a few
    // frames until the scroll range catches up.
    const target = scrollPosRef.current;
    if (target > 0) {
      let attempts = 0;
      const restore = () => {
        try {
          win.scrollTo(0, target);
        } catch {
          return;
        }
        if (win.scrollY < target - 1 && attempts < 20) {
          attempts += 1;
          win.requestAnimationFrame(restore);
        }
      };
      restore();
    }

    // Keep tracking; the listener is discarded with this window on the next
    // reload, so there's nothing to clean up.
    win.addEventListener(
      'scroll',
      () => {
        scrollPosRef.current = win.scrollY;
      },
      { passive: true }
    );
  }, [applyMode]);

  return (
    <div className="flex h-full flex-col">
      {/* Hidden file input for import */}
      <input
        ref={actions.importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={actions.handleImportFileChange}
        data-testid="import-config-input"
      />

      {/* Preview Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Email Preview</h2>

        <div className="flex items-center gap-1.5">
          {/* Import */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={actions.handleImportConfig}
            aria-label="Import"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={actions.openExportDialog}
            disabled={!hasContent}
            aria-label="Export"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>

          {/* Start Over with AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset everything to defaults and cannot be undone.
                  All promotion data, entries, attachments, and your bulk email
                  recipient list will be cleared. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={actions.handleStartOver}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Preview Tabs
       * When dev mode is off there's only one surface (Preview), so the
       * Preview / HTML Code tabs are hidden. Everything lives on a single
       * compact toolbar row below the header. */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <PreviewToolbar
          devMode={devMode}
          previewWidth={previewWidth}
          onViewportChange={handleViewportChange}
          previewDark={effectiveDark}
          onThemeChange={handleThemeChange}
          previewInversion={previewInversion}
          onInversionChange={handleInversionChange}
          hasContent={hasContent}
          onPrint={actions.handlePrint}
        />

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          {hasContent ? (
            <div
              className={cn(
                'h-full mx-auto transition-[width,max-width] duration-200',
                previewWidth === 'mobile'
                  ? 'max-w-[320px] border-x border-dashed'
                  : 'w-full'
              )}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewHTML}
                onLoad={handleIframeLoad}
                className="h-full w-full border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <div className="flex min-h-[400px] w-full items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Enter promotion details to see preview
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {devMode && (
          <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-4">
              <textarea
                className="h-full w-full rounded-md border bg-muted/50 p-3 font-mono text-xs"
                value={emailHTML || ''}
                placeholder="HTML code will appear here..."
                readOnly
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Preview Actions */}
      <div className="flex flex-wrap gap-2 border-t px-4 py-3">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!hasContent || store.bulkEmailGenerating}
          onClick={actions.handleGenerateClick}
        >
          {store.bulkEmailGenerating ? (
            <>
              <Spinner className="size-3.5" />
              <span className="tabular-nums">
                Generating... {store.bulkEmailProgress}
              </span>
            </>
          ) : (
            <>
              <Mail className="h-3.5 w-3.5" />
              Generate Email Batches
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={actions.handleDownloadDraft}
          disabled={!hasContent}
        >
          <FileDown className="h-3.5 w-3.5" />
          Download Email Draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={actions.handleDownloadHTML}
          disabled={!hasContent}
        >
          <FileCode className="h-3.5 w-3.5" />
          Download HTML
        </Button>
      </div>

      <ExportOptionsDialog
        open={actions.exportDialogOpen}
        onOpenChange={actions.setExportDialogOpen}
        includeRecipients={actions.exportIncludeRecipients}
        onIncludeRecipientsChange={actions.setExportIncludeRecipients}
        includePdfData={actions.exportIncludePdfData}
        onIncludePdfDataChange={actions.setExportIncludePdfData}
        onExport={actions.handleExportConfig}
      />

      <GenerateWarningDialog
        open={actions.showGenerateWarning}
        onOpenChange={actions.setShowGenerateWarning}
        warnings={actions.generateWarnings}
        onGenerateAnyway={actions.handleGenerateAnyway}
      />
    </div>
  );
}
