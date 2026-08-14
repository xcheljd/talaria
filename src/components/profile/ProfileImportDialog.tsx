/**
 * ProfileImportDialog — "Import Profile" dialog plus its hidden file input.
 *
 * Owns the file-reading and form-reset logic: reading a backup JSON resets the
 * page's form (passed in) and restores the validated palette preferences. Kept
 * mounted by the page at all times so the hidden input is always available;
 * the dialog itself is controlled via `open`.
 */

import { useState, useRef, useCallback } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { useTheme } from '@/contexts/ThemeProvider';
import {
  type ProfileFormValues,
  DEFAULT_STORE_HOURS,
} from '@/lib/profile-validation';
import { validatePalette } from '@/lib/theme-utils';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfileImportDialogProps {
  form: UseFormReturn<ProfileFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileImportDialog({
  form,
  open,
  onOpenChange,
}: ProfileImportDialogProps) {
  const { setLightPalette, setDarkPalette } = useTheme();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setImportError('Please select a JSON file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);

          if (!importedData.profile) {
            throw new Error('Invalid profile file format');
          }

          const importedProfile = importedData.profile;

          form.reset({
            employeeName: importedProfile.employeeName || '',
            jobTitle: importedProfile.jobTitle || '',
            companyEmail: importedProfile.companyEmail || '',
            companyName: importedProfile.companyName || '',
            storeName: importedProfile.storeName || '',
            storeLocation: importedProfile.storeLocation || '',
            storePhone: importedProfile.storePhone || '',
            storeEmail: importedProfile.storeEmail || '',
            storeAddress: importedProfile.storeAddress || '',
            storePlusCode: importedProfile.storePlusCode || '',
            storeHours: importedProfile.storeHours || DEFAULT_STORE_HOURS,
            storeDirections: importedProfile.storeDirections || '',
            productNoun: importedProfile.productNoun || '',
            productNounPlural: importedProfile.productNounPlural || '',
            brandLinks: Array.isArray(importedProfile.brandLinks)
              ? importedProfile.brandLinks
                  .filter(
                    (link: unknown): link is { name?: string; url?: string } =>
                      !!link && typeof link === 'object'
                  )
                  .map((link: { name?: string; url?: string }) => ({
                    name: String(link.name ?? ''),
                    url: String(link.url ?? ''),
                  }))
              : [],
            brandKeywords: Array.isArray(importedProfile.brandKeywords)
              ? importedProfile.brandKeywords.map(String).join(', ')
              : '',
            collectionKeywords: Array.isArray(
              importedProfile.collectionKeywords
            )
              ? importedProfile.collectionKeywords.map(String).join(', ')
              : '',
          });

          // Restore theme preferences (validated — imported files can carry
          // arbitrary strings)
          if (importedProfile.lightPalette) {
            setLightPalette(
              validatePalette(importedProfile.lightPalette, 'light')
            );
          }
          if (importedProfile.darkPalette) {
            setDarkPalette(
              validatePalette(importedProfile.darkPalette, 'dark')
            );
          }

          onOpenChange(false);
          setImportError(null);
        } catch (error) {
          setImportError(
            error instanceof Error ? error.message : 'Failed to import profile'
          );
        }
      };
      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [form, setLightPalette, setDarkPalette, onOpenChange]
  );

  return (
    <>
      {/* Import Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Profile</DialogTitle>
            <DialogDescription>
              Select a JSON file to import your profile data. This will replace
              all current form values.
            </DialogDescription>
          </DialogHeader>
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />
              Choose File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
        data-testid="import-file-input"
      />
    </>
  );
}
