/**
 * NewsletterStylePanel — the newsletter's look (box border/background/heading
 * color, and table style) as two tabs inside the editor's "Style" popover.
 * Purely store-driven (newsletterStyle + emailPalette); no editor dependency.
 */

import { useShallow } from 'zustand/react/shallow';
import { RotateCcw } from 'lucide-react';

import { usePromotionStore } from '@/stores/promotion-store';
import { useNewsletterStore } from '@/stores/newsletter-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function NewsletterStylePanel() {
  // Newsletter-domain fields (newsletterStyle + its setter) live in the
  // newsletter store (plan 022). emailPalette is the palette domain and stays
  // on the main store, so we read from both.
  const { newsletterStyle, setNewsletterStyle } = useNewsletterStore(
    useShallow((s) => ({
      newsletterStyle: s.newsletterStyle,
      setNewsletterStyle: s.setNewsletterStyle,
    }))
  );
  const emailPalette = usePromotionStore((s) => s.emailPalette);
  const store = { newsletterStyle, setNewsletterStyle, emailPalette };

  return (
    <Tabs defaultValue="box" className="gap-0">
      <div className="border-b px-3 py-2">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="box" data-testid="newsletter-customize-toggle">
            Box &amp; heading
          </TabsTrigger>
          <TabsTrigger
            value="table"
            data-testid="newsletter-table-style-toggle"
          >
            Tables
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="box" className="flex flex-col gap-4 px-3 py-3">
        {/* Border Style Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Border Style
          </label>
          <div className="flex gap-1.5">
            {(
              [
                { value: 'left', label: 'Left', preview: 'border-l-4' },
                { value: 'full', label: 'Full', preview: 'border' },
                { value: 'none', label: 'None', preview: '' },
                { value: 'top', label: 'Top', preview: 'border-t-4' },
              ] as const
            ).map((opt) => (
              <Button
                variant="ghost"
                static
                key={opt.value}
                type="button"
                className={cn(
                  'h-8 w-12 border text-[10px] font-normal',
                  store.newsletterStyle.borderStyle === opt.value
                    ? 'border-primary bg-primary/10 text-primary-text hover:bg-primary/10'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() =>
                  store.setNewsletterStyle({ borderStyle: opt.value })
                }
                aria-label={`Border style: ${opt.label}`}
                data-testid={`border-style-${opt.value}`}
              >
                <div
                  className={cn(
                    'h-5 w-8 bg-muted',
                    opt.value === 'left' && 'border-l-[3px] border-l-primary',
                    opt.value === 'full' && 'border border-primary',
                    opt.value === 'top' && 'border-t-[3px] border-t-primary'
                  )}
                />
              </Button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        {(
          [
            {
              key: 'borderColor' as const,
              label: 'Border Color',
              autoHint: 'Footer',
              swatches: [
                { color: store.emailPalette.footerBg, label: 'Footer' },
                { color: store.emailPalette.link, label: 'Link' },
                { color: store.emailPalette.accent, label: 'Accent' },
                { color: store.emailPalette.text, label: 'Text' },
              ],
            },
            {
              key: 'backgroundColor' as const,
              label: 'Background',
              autoHint: 'Section',
              swatches: [
                { color: store.emailPalette.sectionBg, label: 'Section' },
                {
                  color: store.emailPalette.unsubscribeBg,
                  label: 'Subtle',
                },
                { color: store.emailPalette.footerBg, label: 'Footer' },
                { color: store.emailPalette.bodyBg, label: 'Body' },
              ],
            },
            {
              key: 'headingColor' as const,
              label: 'Heading Color',
              autoHint: 'Footer',
              swatches: [
                { color: store.emailPalette.footerBg, label: 'Footer' },
                { color: store.emailPalette.link, label: 'Link' },
                { color: store.emailPalette.accent, label: 'Accent' },
                { color: store.emailPalette.text, label: 'Text' },
              ],
            },
          ] as const
        ).map((picker) => {
          const currentValue = store.newsletterStyle[picker.key];
          return (
            <div key={picker.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground min-w-[90px]">
                  {picker.label}
                </label>
                <div
                  className="size-5 rounded border border-border shrink-0"
                  style={{
                    backgroundColor: currentValue ?? '#888',
                    backgroundImage: currentValue
                      ? undefined
                      : 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)',
                    backgroundSize: currentValue ? undefined : '8px 8px',
                  }}
                  data-testid={`swatch-${picker.key}`}
                />
                <input
                  type="color"
                  value={currentValue ?? '#2563eb'}
                  onChange={(e) =>
                    store.setNewsletterStyle({
                      [picker.key]: e.target.value,
                    })
                  }
                  className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                  aria-label={`Pick ${picker.label}`}
                  data-testid={`picker-${picker.key}`}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                      onClick={() =>
                        store.setNewsletterStyle({ [picker.key]: null })
                      }
                      disabled={currentValue === null}
                      aria-label={`Reset ${picker.label} to auto`}
                      data-testid={`auto-${picker.key}`}
                    >
                      <RotateCcw className="size-2.5" />
                      Auto
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{`Auto uses email ${picker.autoHint.toLowerCase()} color`}</TooltipContent>
                </Tooltip>
              </div>
              {/* Email palette swatches */}
              <div className="flex items-center gap-1 ml-[98px]">
                {picker.swatches.map((sw) => (
                  <Tooltip key={sw.color}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'size-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                          currentValue === sw.color &&
                            'ring-1 ring-primary ring-offset-1'
                        )}
                        style={{ backgroundColor: sw.color }}
                        onClick={() =>
                          store.setNewsletterStyle({
                            [picker.key]: sw.color,
                          })
                        }
                        aria-label={`Set ${picker.label} to ${sw.label} color`}
                        data-testid={`palette-swatch-${picker.key}-${sw.label.toLowerCase()}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{`${sw.label} (${sw.color})`}</TooltipContent>
                  </Tooltip>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">
                  email colors
                </span>
              </div>
            </div>
          );
        })}
      </TabsContent>
      <TabsContent value="table" className="flex flex-col gap-4 px-3 py-3">
        {/* Border Style */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Border Style
          </label>
          <div className="flex gap-1.5">
            {(
              [
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'none', label: 'None' },
              ] as const
            ).map((opt) => (
              <Button
                variant="ghost"
                static
                key={opt.value}
                type="button"
                className={cn(
                  'h-8 border px-3 text-[10px] font-normal',
                  store.newsletterStyle.tableBorderStyle === opt.value
                    ? 'border-primary bg-primary/10 text-primary-text hover:bg-primary/10'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() =>
                  store.setNewsletterStyle({
                    tableBorderStyle: opt.value,
                  })
                }
                aria-label={`Table border style: ${opt.label}`}
                data-testid={`table-border-style-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Border Width */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Border Width
          </label>
          <div className="flex gap-1.5">
            {([1, 2, 3] as const).map((w) => (
              <Button
                variant="ghost"
                static
                key={w}
                type="button"
                className={cn(
                  'h-8 w-10 border px-0 text-[10px] font-normal',
                  store.newsletterStyle.tableBorderWidth === w
                    ? 'border-primary bg-primary/10 text-primary-text hover:bg-primary/10'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() =>
                  store.setNewsletterStyle({ tableBorderWidth: w })
                }
                aria-label={`Table border width: ${w}px`}
                data-testid={`table-border-width-${w}`}
              >
                {w}px
              </Button>
            ))}
          </div>
        </div>

        {/* Border Color */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground min-w-[90px]">
              Border Color
            </label>
            <div
              className="size-5 rounded border border-border shrink-0"
              style={{
                backgroundColor:
                  store.newsletterStyle.tableBorderColor ??
                  store.emailPalette.text,
              }}
            />
            <input
              type="color"
              value={
                store.newsletterStyle.tableBorderColor ??
                store.emailPalette.text
              }
              onChange={(e) =>
                store.setNewsletterStyle({
                  tableBorderColor: e.target.value,
                })
              }
              className="h-6 w-8 cursor-pointer rounded border-0 p-0"
              aria-label="Pick table border color"
              data-testid="picker-tableBorderColor"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                  onClick={() =>
                    store.setNewsletterStyle({ tableBorderColor: null })
                  }
                  disabled={store.newsletterStyle.tableBorderColor === null}
                  aria-label="Reset table border color to auto"
                >
                  <RotateCcw className="size-2.5" />
                  Auto
                </Button>
              </TooltipTrigger>
              <TooltipContent>Auto uses email text color</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 ml-[98px]">
            {[
              { color: store.emailPalette.text, label: 'Text' },
              { color: store.emailPalette.accent, label: 'Accent' },
              { color: store.emailPalette.footerBg, label: 'Footer' },
              { color: store.emailPalette.link, label: 'Link' },
            ].map((sw) => (
              <Tooltip key={sw.color}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'size-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                      store.newsletterStyle.tableBorderColor === sw.color &&
                        'ring-1 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: sw.color }}
                    onClick={() =>
                      store.setNewsletterStyle({
                        tableBorderColor: sw.color,
                      })
                    }
                    aria-label={`Set table border color to ${sw.label}`}
                  />
                </TooltipTrigger>
                <TooltipContent>{`${sw.label} (${sw.color})`}</TooltipContent>
              </Tooltip>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              email colors
            </span>
          </div>
        </div>

        {/* Header Background */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground min-w-[90px]">
              Header Bg
            </label>
            <div
              className="size-5 rounded border border-border shrink-0"
              style={{
                backgroundColor:
                  store.newsletterStyle.tableHeaderBg ??
                  store.emailPalette.sectionBg,
              }}
            />
            <input
              type="color"
              value={
                store.newsletterStyle.tableHeaderBg ??
                store.emailPalette.sectionBg
              }
              onChange={(e) =>
                store.setNewsletterStyle({
                  tableHeaderBg: e.target.value,
                })
              }
              className="h-6 w-8 cursor-pointer rounded border-0 p-0"
              aria-label="Pick table header background"
              data-testid="picker-tableHeaderBg"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                  onClick={() =>
                    store.setNewsletterStyle({ tableHeaderBg: null })
                  }
                  disabled={store.newsletterStyle.tableHeaderBg === null}
                  aria-label="Reset table header background to auto"
                >
                  <RotateCcw className="size-2.5" />
                  Auto
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Auto uses email section background
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 ml-[98px]">
            {[
              { color: store.emailPalette.sectionBg, label: 'Section' },
              { color: store.emailPalette.footerBg, label: 'Footer' },
              {
                color: store.emailPalette.unsubscribeBg,
                label: 'Subtle',
              },
              { color: store.emailPalette.bodyBg, label: 'Body' },
            ].map((sw) => (
              <Tooltip key={sw.color}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'size-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                      store.newsletterStyle.tableHeaderBg === sw.color &&
                        'ring-1 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: sw.color }}
                    onClick={() =>
                      store.setNewsletterStyle({
                        tableHeaderBg: sw.color,
                      })
                    }
                    aria-label={`Set table header bg to ${sw.label}`}
                  />
                </TooltipTrigger>
                <TooltipContent>{`${sw.label} (${sw.color})`}</TooltipContent>
              </Tooltip>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              email colors
            </span>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
