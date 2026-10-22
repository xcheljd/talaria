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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
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
        <FieldGroup className="gap-4 rounded-lg border bg-card p-4">
          {/* Download Folder */}
          <DownloadFolderSection
            isTauri={isTauri}
            downloadFolder={downloadFolder}
            onChooseFolder={onChooseFolder}
          />

          {/* Download Behavior */}
          <Field orientation="horizontal">
            <Switch
              id="download-save-as"
              checked={downloadSaveAs}
              onCheckedChange={handleDownloadSaveAsChange}
            />
            <FieldContent>
              <FieldLabel htmlFor="download-save-as">
                Ask where to save each download
              </FieldLabel>
              <FieldDescription className="text-xs">
                When enabled, a Save As dialog appears for every download
                (drafts, HTML, exports, batch files). When disabled, files save
                silently to your configured download folder. Only applies in the
                desktop app.
              </FieldDescription>
            </FieldContent>
          </Field>

          {/* PDF Optimization */}
          <Field orientation="horizontal">
            <Switch
              id="pdf-optimize"
              checked={pdfOptimize}
              onCheckedChange={handlePdfOptimizeChange}
            />
            <FieldContent>
              <FieldLabel htmlFor="pdf-optimize">
                Optimize attached PDFs
              </FieldLabel>
              <FieldDescription className="text-xs">
                Downsamples over-resolution embedded images to reduce file size
                when attaching PDFs. Disable to attach PDFs exactly as-is.
              </FieldDescription>
            </FieldContent>
          </Field>

          <Field orientation="horizontal">
            <Switch
              id="strip-accessibility"
              checked={stripAccessibility}
              onCheckedChange={handleStripAccessibilityChange}
            />
            <FieldContent>
              <FieldLabel htmlFor="strip-accessibility">
                Strip accessibility metadata from attached PDFs
              </FieldLabel>
              <FieldDescription className="text-xs">
                Removes screen-reader metadata (StructTreeRoot) for ~18%
                additional size reduction. Suitable for visual-only documents
                such as promotion flyers. Disable if your PDFs contain
                substantial text for screen-reader users.
              </FieldDescription>
            </FieldContent>
          </Field>

          {/* Dev Mode */}
          <Field orientation="horizontal">
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={handleDevModeChange}
              data-testid="dev-mode-switch"
            />
            <FieldContent>
              <FieldLabel htmlFor="dev-mode">Dev mode</FieldLabel>
              <FieldDescription className="text-xs">
                Reveals advanced surfaces still under construction: the
                promotion HTML Code tab, and the Email Theme, Accessibility
                Check, and Outlook Compatibility cards. Persists across
                sessions.
              </FieldDescription>
            </FieldContent>
          </Field>

          {/* Sync email preview with app theme */}
          <Field orientation="horizontal">
            <Switch
              id="sync-preview-theme"
              checked={syncPreviewTheme}
              onCheckedChange={setSyncPreviewTheme}
              data-testid="sync-preview-theme-switch"
            />
            <FieldContent>
              <FieldLabel htmlFor="sync-preview-theme">
                Sync email preview with app theme
              </FieldLabel>
              <FieldDescription className="text-xs">
                When on, the live email preview follows the app's light/dark
                mode — switching one switches the other. Turn off to keep the
                preview's own light/dark toggle independent of the app theme.
              </FieldDescription>
            </FieldContent>
          </Field>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Light Palette Selector */}
            <Field className="gap-2">
              <FieldLabel htmlFor="light-palette">
                Light Mode Color Palette
              </FieldLabel>
              <Select value={lightPalette} onValueChange={setLightPalette}>
                <SelectTrigger id="light-palette" className="w-full">
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
              <FieldDescription className="text-xs">
                Choose your preferred color scheme for light mode
              </FieldDescription>
            </Field>

            {/* Dark Palette Selector */}
            <Field className="gap-2">
              <FieldLabel htmlFor="dark-palette">
                Dark Mode Color Palette
              </FieldLabel>
              <Select value={darkPalette} onValueChange={setDarkPalette}>
                <SelectTrigger id="dark-palette" className="w-full">
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
              <FieldDescription className="text-xs">
                Choose your preferred color scheme for dark mode
              </FieldDescription>
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
