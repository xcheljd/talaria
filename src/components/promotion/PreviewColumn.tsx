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

import { useState, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Mail,
  FileDown,
  FileCode,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore } from '@/stores/promotion-store';
import {
  applyDarkModePreview,
  type DarkModeStyle,
} from '@/lib/promotion-email-html';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
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

  const [activeTab, setActiveTab] = useState('preview');
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>(
    'desktop'
  );
  const [previewDark, setPreviewDark] = useState(false);
  // Which client dark-mode model to emulate: 'full' inverts every color
  // (Outlook Windows, Gmail iOS); 'partial' only darkens light backgrounds and
  // lightens dark text/borders, leaving already-dark areas (Gmail mobile,
  // Outlook.com). See applyDarkModePreview.
  const [previewInversion, setPreviewInversion] =
    useState<DarkModeStyle>('full');

  // Dark-mode preview emulates a client-side inversion by transforming the
  // colors of the already-built (light) `emailHTML` rather than regenerating —
  // see applyDarkModePreview. It's a cheap string pass and `emailHTML` is
  // already coalesced upstream in PromotionPage, so it only recomputes when the
  // light HTML settles, the toggle flips, or the inversion model changes.
  const darkModeHTML = useMemo(() => {
    if (!emailHTML || !previewDark) return '';
    return applyDarkModePreview(emailHTML, previewInversion);
  }, [emailHTML, previewDark, previewInversion]);

  // The exact document fed to the preview iframe. Both branches derive from the
  // coalesced `emailHTML`, so the iframe's srcDoc — and the full-document
  // re-parse it triggers — changes only when typing pauses, not per keystroke.
  // Exports read the same coalesced `emailHTML`, settled by the time they click.
  const previewHTML = emailHTML
    ? previewDark
      ? darkModeHTML
      : emailHTML
    : PREVIEW_PLACEHOLDER_HTML;

  const hasContent = !!emailHTML;

  const handleViewportChange = useCallback((v: string) => {
    if (v === 'desktop' || v === 'mobile') setPreviewWidth(v);
  }, []);

  const handleThemeChange = useCallback((v: string) => {
    if (v === 'light') setPreviewDark(false);
    else if (v === 'dark') setPreviewDark(true);
  }, []);

  const handleInversionChange = useCallback((v: string) => {
    if (v === 'full' || v === 'partial') setPreviewInversion(v);
  }, []);

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
          previewDark={previewDark}
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
                srcDoc={previewHTML}
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
