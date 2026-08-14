/**
 * PreferencesSection — the "Preferences" sidebar section.
 *
 * Download folder + download/PDF behavior switches, dev mode, preview theme
 * sync, and the light/dark palette selectors.
 *
 * The localStorage-backed switches own their own state here: nothing outside
 * this card reads them, and each write persists immediately. The download
 * folder is the exception — the page seeds it from the Rust config on mount
 * (so the value is already resolved when this section first renders) and
 * passes it down.
 */

import { useState, useCallback } from 'react';

import { useTheme } from '@/contexts/ThemeProvider';
import { useDevMode } from '@/hooks/useDevMode';
import { usePreviewThemeSync } from '@/hooks/usePreviewThemeSync';
import {
  VALID_LIGHT_PALETTES,
  VALID_DARK_PALETTES,
  LIGHT_PALETTE_LABELS,
  DARK_PALETTE_LABELS,
} from '@/lib/theme-utils';
import { StorageKeys } from '@/lib/storage-keys';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DownloadFolderSection } from '@/components/profile/DownloadFolderSection';

interface PreferencesSectionProps {
  isTauri: boolean;
  downloadFolder: string;
  onChooseFolder: () => void;
}

export function PreferencesSection({
  isTauri,
  downloadFolder,
  onChooseFolder,
}: PreferencesSectionProps) {
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } =
    useTheme();
  const { devMode, setDevMode } = useDevMode();
  const { syncPreviewTheme, setSyncPreviewTheme } = usePreviewThemeSync();

  const [pdfOptimize, setPdfOptimize] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.pdfOptimize) !== 'false'
  );
  const [stripAccessibility, setStripAccessibility] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.pdfStripAccessibility) !== 'false'
  );
  const [downloadSaveAs, setDownloadSaveAs] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.downloadSaveAs) !== 'false'
  );

  const handlePdfOptimizeChange = useCallback((checked: boolean) => {
    setPdfOptimize(checked);
    localStorage.setItem(StorageKeys.pdfOptimize, String(checked));
  }, []);

  const handleStripAccessibilityChange = useCallback((checked: boolean) => {
    setStripAccessibility(checked);
    localStorage.setItem(StorageKeys.pdfStripAccessibility, String(checked));
  }, []);

  const handleDownloadSaveAsChange = useCallback((checked: boolean) => {
    setDownloadSaveAs(checked);
    localStorage.setItem(StorageKeys.downloadSaveAs, String(checked));
  }, []);

  const handleDevModeChange = useCallback(
    (checked: boolean) => {
      setDevMode(checked);
    },
    [setDevMode]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Preferences</CardTitle>
        <CardDescription>Customize your app preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
          {/* Download Folder */}
          <DownloadFolderSection
            isTauri={isTauri}
            downloadFolder={downloadFolder}
            onChooseFolder={onChooseFolder}
          />

          {/* Download Behavior */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="download-save-as"
                checked={downloadSaveAs}
                onCheckedChange={handleDownloadSaveAsChange}
              />
              <Label htmlFor="download-save-as">
                Ask where to save each download
              </Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              When enabled, a Save As dialog appears for every download (drafts,
              HTML, exports, batch files). When disabled, files save silently to
              your configured download folder. Only applies in the desktop app.
            </p>
          </div>

          {/* PDF Optimization */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="pdf-optimize"
                checked={pdfOptimize}
                onCheckedChange={handlePdfOptimizeChange}
              />
              <Label htmlFor="pdf-optimize">Optimize attached PDFs</Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Downsamples over-resolution embedded images to reduce file size
              when attaching PDFs. Disable to attach PDFs exactly as-is.
            </p>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="strip-accessibility"
                checked={stripAccessibility}
                onCheckedChange={handleStripAccessibilityChange}
              />
              <Label htmlFor="strip-accessibility">
                Strip accessibility metadata from attached PDFs
              </Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Removes screen-reader metadata (StructTreeRoot) for ~18%
              additional size reduction. Suitable for visual-only documents such
              as promotion flyers. Disable if your PDFs contain substantial text
              for screen-reader users.
            </p>
          </div>

          {/* Dev Mode */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="dev-mode"
                checked={devMode}
                onCheckedChange={handleDevModeChange}
                data-testid="dev-mode-switch"
              />
              <Label htmlFor="dev-mode">Dev mode</Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Reveals advanced surfaces still under construction: the Templates
              page, the promotion HTML Code tab, and the Email Theme,
              Accessibility Check, and Outlook Compatibility cards. Persists
              across sessions.
            </p>
          </div>

          {/* Sync email preview with app theme */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="sync-preview-theme"
                checked={syncPreviewTheme}
                onCheckedChange={setSyncPreviewTheme}
                data-testid="sync-preview-theme-switch"
              />
              <Label htmlFor="sync-preview-theme">
                Sync email preview with app theme
              </Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              When on, the live email preview follows the app's light/dark mode
              — switching one switches the other. Turn off to keep the preview's
              own light/dark toggle independent of the app theme.
            </p>
          </div>

          {/* Light Palette Selector */}
          <div>
            <Label className="mb-2 block">Light Mode Color Palette</Label>
            <Select value={lightPalette} onValueChange={setLightPalette}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_LIGHT_PALETTES.map((palette) => (
                  <SelectItem key={palette} value={palette}>
                    {LIGHT_PALETTE_LABELS[palette] || palette}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose your preferred color scheme for light mode
            </p>
          </div>

          {/* Dark Palette Selector */}
          <div>
            <Label className="mb-2 block">Dark Mode Color Palette</Label>
            <Select value={darkPalette} onValueChange={setDarkPalette}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_DARK_PALETTES.map((palette) => (
                  <SelectItem key={palette} value={palette}>
                    {DARK_PALETTE_LABELS[palette] || palette}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose your preferred color scheme for dark mode
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
