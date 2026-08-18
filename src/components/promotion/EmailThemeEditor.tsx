/**
 * EmailThemeEditor — Color palette editor for the promotion email template.
 *
 * Lets users customize the email's overall color scheme. Newsletter "auto"
 * colors and all email sections derive from this palette.
 * Includes built-in presets and ability to save/load custom palettes.
 */

import { useState } from 'react';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  DEFAULT_EMAIL_PALETTE,
  type EmailPaletteConfig,
} from '@/stores/promotion-store';
import { StorageKeys } from '@/lib/storage-keys';

interface PaletteField {
  key: keyof EmailPaletteConfig;
  label: string;
  description: string;
}

const PALETTE_FIELDS: PaletteField[] = [
  {
    key: 'footerBg',
    label: 'Footer',
    description: 'Footer & header accent background',
  },
  {
    key: 'sectionBg',
    label: 'Section Bg',
    description: 'How to Shop box background',
  },
  {
    key: 'unsubscribeBg',
    label: 'Unsubscribe Bg',
    description: 'Unsubscribe row background',
  },
  {
    key: 'accent',
    label: 'Accent',
    description: 'Store hours & special hours text',
  },
  { key: 'text', label: 'Text', description: 'Primary body text color' },
  { key: 'link', label: 'Link', description: 'Link & callout text color' },
  {
    key: 'noteBorder',
    label: 'Note Border',
    description: 'Important notes box border',
  },
  {
    key: 'headerBorder',
    label: 'Header Border',
    description: 'Header separator line',
  },
  { key: 'bodyBg', label: 'Body Bg', description: 'Email body background' },
  {
    key: 'footerText',
    label: 'Footer Text',
    description: 'Footer text & link color',
  },
];

// Built-in palette presets
interface PresetGroup {
  label: string;
  presets: { name: string; palette: EmailPaletteConfig }[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    label: 'General',
    presets: [
      {
        name: 'Classic (Default)',
        palette: { ...DEFAULT_EMAIL_PALETTE },
      },
      {
        name: 'Ocean Blue',
        palette: {
          footerBg: '#1a365d',
          sectionBg: '#ebf8ff',
          unsubscribeBg: '#e2e8f0',
          accent: '#ed8936',
          text: '#2d3748',
          link: '#2b6cb0',
          noteBorder: '#bee3f8',
          headerBorder: '#2b6cb0',
          bodyBg: 'white',
          footerText: 'white',
        },
      },
      {
        name: 'Warm Earth',
        palette: {
          footerBg: '#744210',
          sectionBg: '#fffff0',
          unsubscribeBg: '#fefcbf',
          accent: '#d69e2e',
          text: '#5a4a3a',
          link: '#b7791f',
          noteBorder: '#ecc94b',
          headerBorder: '#b7791f',
          bodyBg: 'white',
          footerText: '#fffff0',
        },
      },
      {
        name: 'Modern Dark',
        palette: {
          footerBg: '#1a1a2e',
          sectionBg: '#f0f0f5',
          unsubscribeBg: '#e8e8ed',
          accent: '#e94560',
          text: '#16213e',
          link: '#0f3460',
          noteBorder: '#c4c4cc',
          headerBorder: '#0f3460',
          bodyBg: 'white',
          footerText: '#eaeaea',
        },
      },
    ],
  },
  {
    label: 'Seasonal',
    presets: [
      {
        name: "Valentine's",
        palette: {
          footerBg: '#9b1b30',
          sectionBg: '#fff0f3',
          unsubscribeBg: '#ffe4e9',
          accent: '#F6BCCE',
          text: '#4a1025',
          link: '#c41e4a',
          noteBorder: '#f5a3b5',
          headerBorder: '#e84572',
          bodyBg: 'white',
          footerText: '#ffd6de',
        },
      },
      {
        name: 'Spring',
        palette: {
          footerBg: '#2d6a4f',
          sectionBg: '#f0fff4',
          unsubscribeBg: '#e6f7ed',
          accent: '#f4a261',
          text: '#1b4332',
          link: '#40916c',
          noteBorder: '#95d5b2',
          headerBorder: '#52b788',
          bodyBg: 'white',
          footerText: '#d8f3dc',
        },
      },
      {
        name: 'Summer',
        palette: {
          footerBg: '#0077b6',
          sectionBg: '#f0f9ff',
          unsubscribeBg: '#e0f2fe',
          accent: '#f77f00',
          text: '#023e58',
          link: '#0096c7',
          noteBorder: '#90e0ef',
          headerBorder: '#00b4d8',
          bodyBg: 'white',
          footerText: '#caf0f8',
        },
      },
      {
        name: 'Autumn',
        palette: {
          footerBg: '#6b3a2a',
          sectionBg: '#fdf6ec',
          unsubscribeBg: '#f5ead6',
          accent: '#e07b39',
          text: '#3d2215',
          link: '#bc6c25',
          noteBorder: '#ddb892',
          headerBorder: '#bc6c25',
          bodyBg: 'white',
          footerText: '#f5ead6',
        },
      },
      {
        name: 'Winter',
        palette: {
          footerBg: '#1b3a5c',
          sectionBg: '#f0f4f8',
          unsubscribeBg: '#e2e8f0',
          accent: '#a0c4e8',
          text: '#1a2a3a',
          link: '#3a7cbd',
          noteBorder: '#b8d4e8',
          headerBorder: '#6ba3d6',
          bodyBg: 'white',
          footerText: '#cddcec',
        },
      },
    ],
  },
];

interface SavedPalette {
  name: string;
  palette: EmailPaletteConfig;
}

function loadSavedPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(StorageKeys.emailPaletteSaved);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedPalettes(palettes: SavedPalette[]) {
  localStorage.setItem(StorageKeys.emailPaletteSaved, JSON.stringify(palettes));
}

export function EmailThemeEditor() {
  const store = usePromotionStore(
    useShallow((s) => ({
      emailPalette: s.emailPalette,
      setEmailPalette: s.setEmailPalette,
      resetEmailPalette: s.resetEmailPalette,
    }))
  );
  const palette = store.emailPalette;
  const [savedPalettes, setSavedPalettes] =
    useState<SavedPalette[]>(loadSavedPalettes);
  const [saveName, setSaveName] = useState('');

  const isDefault = PALETTE_FIELDS.every(
    (f) => palette[f.key] === DEFAULT_EMAIL_PALETTE[f.key]
  );

  const handleSavePalette = () => {
    const name = saveName.trim();
    if (!name) return;
    const updated = [
      ...savedPalettes.filter((p) => p.name !== name),
      { name, palette: { ...palette } },
    ];
    setSavedPalettes(updated);
    persistSavedPalettes(updated);
    setSaveName('');
  };

  const handleDeleteSaved = (name: string) => {
    const updated = savedPalettes.filter((p) => p.name !== name);
    setSavedPalettes(updated);
    persistSavedPalettes(updated);
  };

  const handleApplyPalette = (p: EmailPaletteConfig) => {
    store.setEmailPalette(p);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Customize the email color scheme. Newsletter auto-colors follow this
        palette.
      </p>

      {/* Preset Palettes — Grouped */}
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {group.label}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {group.presets.map((preset) => (
              <Tooltip key={preset.name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] hover:bg-accent/50 transition-colors"
                    onClick={() => handleApplyPalette(preset.palette)}
                  >
                    <div className="flex gap-0.5">
                      {[
                        preset.palette.footerBg,
                        preset.palette.accent,
                        preset.palette.link,
                        preset.palette.sectionBg,
                      ].map((c, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-sm border border-border"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span>{preset.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{preset.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}

      {/* Saved Custom Palettes */}
      {savedPalettes.length > 0 && (
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Saved
          </label>
          <div className="flex flex-wrap gap-1.5">
            {savedPalettes.map((saved) => (
              <div key={saved.name} className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-[11px] hover:bg-accent/50 transition-colors"
                      onClick={() => handleApplyPalette(saved.palette)}
                    >
                      <div className="flex gap-0.5">
                        {[
                          saved.palette.footerBg,
                          saved.palette.accent,
                          saved.palette.link,
                          saved.palette.sectionBg,
                        ].map((c, i) => (
                          <div
                            key={i}
                            className="h-3 w-3 rounded-sm border border-border"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span>{saved.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{saved.name}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteSaved(saved.name)}
                      aria-label={`Delete palette ${saved.name}`}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{`Delete "${saved.name}"`}</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Pickers Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {PALETTE_FIELDS.map((field) => {
          const value = palette[field.key];
          const isFieldDefault = value === DEFAULT_EMAIL_PALETTE[field.key];

          return (
            <div key={field.key} className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded border border-border shrink-0"
                style={{ backgroundColor: value }}
                data-testid={`theme-swatch-${field.key}`}
              />
              <input
                type="color"
                value={value}
                onChange={(e) =>
                  store.setEmailPalette({ [field.key]: e.target.value })
                }
                className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                aria-label={`Pick ${field.label} color`}
                data-testid={`theme-picker-${field.key}`}
              />
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="text-xs font-medium truncate block">
                      {field.label}
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>{field.description}</TooltipContent>
                </Tooltip>
                {!isFieldDefault && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-[9px] text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          store.setEmailPalette({
                            [field.key]: DEFAULT_EMAIL_PALETTE[field.key],
                          })
                        }
                      >
                        reset
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{`Reset to ${DEFAULT_EMAIL_PALETTE[field.key]}`}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Current Palette */}
      {!isDefault && (
        <div className="flex gap-1.5">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Palette name..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSavePalette();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleSavePalette}
            disabled={!saveName.trim()}
          >
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>
      )}

      {!isDefault && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => store.resetEmailPalette()}
          data-testid="reset-email-palette"
        >
          <RotateCcw className="h-3 w-3" />
          Reset All to Defaults
        </Button>
      )}
    </div>
  );
}
