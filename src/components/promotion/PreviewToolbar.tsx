/**
 * PreviewToolbar — the preview controls row (Preview/HTML tabs, viewport and
 * theme segmented controls, Print). Split out of PreviewColumn.
 */

import { memo } from 'react';
import {
  Eye,
  Code,
  Monitor,
  Smartphone,
  Sun,
  Moon,
  Printer,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PreviewToolbarProps {
  devMode: boolean;
  previewWidth: 'desktop' | 'mobile';
  onViewportChange: (v: string) => void;
  previewDark: boolean;
  onThemeChange: (v: string) => void;
  hasContent: boolean;
  onPrint: () => void;
}

/**
 * Memoized so it doesn't reconcile on every keystroke when PreviewColumn
 * re-renders for edits — all of its props are stable while typing (callbacks are
 * useCallback; hasContent only flips when content appears/disappears).
 * TabsList/TabsTrigger read the Radix Tabs context from the <Tabs> ancestor in
 * PreviewColumn, so this must stay rendered inside it.
 */
export const PreviewToolbar = memo(function PreviewToolbar({
  devMode,
  previewWidth,
  onViewportChange,
  previewDark,
  onThemeChange,
  hasContent,
  onPrint,
}: PreviewToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-2 py-1">
        {/* Preview / HTML Code tabs (dev mode only).
         * flex-none so they shrink to content width, not fill the row. */}
        {devMode && (
          <>
            <TabsList
              variant="toolbar"
              className="flex-none gap-0 rounded-md border border-input p-0 shadow-xs"
            >
              <TabsTrigger value="preview">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="h-3.5 w-3.5" />
                HTML
              </TabsTrigger>
            </TabsList>
            <Separator orientation="vertical" className="mx-0.5 h-4" />
          </>
        )}

        {/* Viewport: mutually-exclusive segmented control (icon + label).
         * ToggleGroupItems use native title= instead of Radix Tooltip to avoid
         * the data-state collision between TooltipTrigger and Toggle (both write
         * data-state on the same DOM node when composed via asChild, causing the
         * active-state styling to disappear). */}
        <ToggleGroup
          type="single"
          value={previewWidth}
          onValueChange={onViewportChange}
          variant="outline"
          size="sm"
          spacing={0}
          colorScheme="primary"
          aria-label="Preview viewport width"
          className="shadow-xs"
        >
          <ToggleGroupItem
            value="desktop"
            aria-label="Desktop preview"
            title="Desktop width (600px)"
            className="gap-1.5 px-2 text-xs"
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </ToggleGroupItem>
          <ToggleGroupItem
            value="mobile"
            aria-label="Mobile preview"
            title="Mobile width (320px)"
            className="gap-1.5 px-2 text-xs"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        {/* Theme: light / dark segmented control */}
        <ToggleGroup
          type="single"
          value={previewDark ? 'dark' : 'light'}
          onValueChange={onThemeChange}
          variant="outline"
          size="sm"
          spacing={0}
          colorScheme="primary"
          aria-label="Preview color scheme"
          className="shadow-xs"
        >
          <ToggleGroupItem
            value="light"
            aria-label="Light preview"
            title="Light preview"
          >
            <Sun className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="dark"
            aria-label="Dark preview"
            title="Dark preview"
          >
            <Moon className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Print: standalone ghost button. Radix Tooltip is safe here because
         * Button has no data-state attribute to collide with. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="ml-auto"
              variant="ghost"
              size="icon-sm"
              onClick={onPrint}
              disabled={!hasContent}
              aria-label="Print email"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Print email</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});
