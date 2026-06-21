/**
 * NewsletterStylePanel — the "Customize Border & Background" and "Customize
 * Table Style" collapsible panels of the newsletter editor. Purely store-driven
 * (newsletterStyle + emailPalette), with no dependency on the TipTap editor, so
 * it reads the store directly and owns only its two open/closed flags.
 */

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

import { usePromotionStore } from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function NewsletterStylePanel() {
  const store = usePromotionStore(
    useShallow((s) => ({
      newsletterStyle: s.newsletterStyle,
      emailPalette: s.emailPalette,
      setNewsletterStyle: s.setNewsletterStyle,
    }))
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [showTableStyle, setShowTableStyle] = useState(false);

  return (
    <>
      {/* Customize Section */}
      <div className="rounded-md border">
        <Collapsible open={showCustomize} onOpenChange={setShowCustomize}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              data-testid="newsletter-customize-toggle"
            >
              <span>Customize Border & Background</span>
              {showCustomize ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          </CollapsibleTrigger>
          {showCustomize && (
            <div className="space-y-3 border-t px-3 py-3">
              {/* Border Style Selector */}
              <div className="space-y-1.5">
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
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex h-8 w-12 items-center justify-center rounded-md border text-[10px] transition-colors ${
                        store.newsletterStyle.borderStyle === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                      onClick={() =>
                        store.setNewsletterStyle({ borderStyle: opt.value })
                      }
                      aria-label={`Border style: ${opt.label}`}
                      data-testid={`border-style-${opt.value}`}
                    >
                      <div
                        className={`h-5 w-8 bg-muted ${
                          opt.value === 'left'
                            ? 'border-l-[3px] border-l-primary'
                            : opt.value === 'full'
                              ? 'border border-primary'
                              : opt.value === 'top'
                                ? 'border-t-[3px] border-t-primary'
                                : ''
                        }`}
                      />
                    </button>
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
                  <div key={picker.key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground min-w-[90px]">
                        {picker.label}
                      </label>
                      <div
                        className="h-5 w-5 rounded border border-border shrink-0"
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                        onClick={() =>
                          store.setNewsletterStyle({ [picker.key]: null })
                        }
                        disabled={currentValue === null}
                        aria-label={`Reset ${picker.label} to auto`}
                        title={`Auto uses email ${picker.autoHint.toLowerCase()} color`}
                        data-testid={`auto-${picker.key}`}
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Auto
                      </Button>
                    </div>
                    {/* Email palette swatches */}
                    <div className="flex items-center gap-1 ml-[98px]">
                      {picker.swatches.map((sw) => (
                        <button
                          key={sw.color}
                          type="button"
                          className={cn(
                            'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                            currentValue === sw.color &&
                              'ring-1 ring-primary ring-offset-1'
                          )}
                          style={{ backgroundColor: sw.color }}
                          onClick={() =>
                            store.setNewsletterStyle({
                              [picker.key]: sw.color,
                            })
                          }
                          title={`${sw.label} (${sw.color})`}
                          aria-label={`Set ${picker.label} to ${sw.label} color`}
                          data-testid={`palette-swatch-${picker.key}-${sw.label.toLowerCase()}`}
                        />
                      ))}
                      <span className="text-[9px] text-muted-foreground ml-1">
                        email colors
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Collapsible>
      </div>

      {/* Customize Table Style */}
      <div className="rounded-md border">
        <Collapsible open={showTableStyle} onOpenChange={setShowTableStyle}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              data-testid="newsletter-table-style-toggle"
            >
              <span>Customize Table Style</span>
              {showTableStyle ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          </CollapsibleTrigger>
          {showTableStyle && (
            <div className="space-y-3 border-t px-3 py-3">
              {/* Border Style */}
              <div className="space-y-1.5">
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
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex h-8 items-center justify-center rounded-md border px-3 text-[10px] transition-colors ${
                        store.newsletterStyle.tableBorderStyle === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                      onClick={() =>
                        store.setNewsletterStyle({
                          tableBorderStyle: opt.value,
                        })
                      }
                      aria-label={`Table border style: ${opt.label}`}
                      data-testid={`table-border-style-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Width */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Border Width
                </label>
                <div className="flex gap-1.5">
                  {([1, 2, 3] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`flex h-8 w-10 items-center justify-center rounded-md border text-[10px] transition-colors ${
                        store.newsletterStyle.tableBorderWidth === w
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                      onClick={() =>
                        store.setNewsletterStyle({ tableBorderWidth: w })
                      }
                      aria-label={`Table border width: ${w}px`}
                      data-testid={`table-border-width-${w}`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Color */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground min-w-[90px]">
                    Border Color
                  </label>
                  <div
                    className="h-5 w-5 rounded border border-border shrink-0"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                    onClick={() =>
                      store.setNewsletterStyle({ tableBorderColor: null })
                    }
                    disabled={store.newsletterStyle.tableBorderColor === null}
                    aria-label="Reset table border color to auto"
                    title="Auto uses email text color"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Auto
                  </Button>
                </div>
                <div className="flex items-center gap-1 ml-[98px]">
                  {[
                    { color: store.emailPalette.text, label: 'Text' },
                    { color: store.emailPalette.accent, label: 'Accent' },
                    { color: store.emailPalette.footerBg, label: 'Footer' },
                    { color: store.emailPalette.link, label: 'Link' },
                  ].map((sw) => (
                    <button
                      key={sw.color}
                      type="button"
                      className={cn(
                        'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                        store.newsletterStyle.tableBorderColor === sw.color &&
                          'ring-1 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: sw.color }}
                      onClick={() =>
                        store.setNewsletterStyle({
                          tableBorderColor: sw.color,
                        })
                      }
                      title={`${sw.label} (${sw.color})`}
                      aria-label={`Set table border color to ${sw.label}`}
                    />
                  ))}
                  <span className="text-[9px] text-muted-foreground ml-1">
                    email colors
                  </span>
                </div>
              </div>

              {/* Header Background */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground min-w-[90px]">
                    Header Bg
                  </label>
                  <div
                    className="h-5 w-5 rounded border border-border shrink-0"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                    onClick={() =>
                      store.setNewsletterStyle({ tableHeaderBg: null })
                    }
                    disabled={store.newsletterStyle.tableHeaderBg === null}
                    aria-label="Reset table header background to auto"
                    title="Auto uses email section background"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Auto
                  </Button>
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
                    <button
                      key={sw.color}
                      type="button"
                      className={cn(
                        'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                        store.newsletterStyle.tableHeaderBg === sw.color &&
                          'ring-1 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: sw.color }}
                      onClick={() =>
                        store.setNewsletterStyle({ tableHeaderBg: sw.color })
                      }
                      title={`${sw.label} (${sw.color})`}
                      aria-label={`Set table header bg to ${sw.label}`}
                    />
                  ))}
                  <span className="text-[9px] text-muted-foreground ml-1">
                    email colors
                  </span>
                </div>
              </div>
            </div>
          )}
        </Collapsible>
      </div>
    </>
  );
}
