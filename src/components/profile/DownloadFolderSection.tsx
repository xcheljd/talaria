/**
 * DownloadFolderSection — shows the folder the desktop app writes downloads to.
 *
 * The value is seeded from the Rust config by ProfileSettingsPage (see the
 * `get_download_dir` effect there) and arrives as a prop, so this component
 * stays a pure display + picker trigger.
 */

import { FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

interface DownloadFolderSectionProps {
  isTauri: boolean;
  downloadFolder: string;
  onChooseFolder: () => void;
}

export function DownloadFolderSection({
  isTauri,
  downloadFolder,
  onChooseFolder,
}: DownloadFolderSectionProps) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor="download-folder">
        Download Folder (Desktop app)
      </FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id="download-folder"
          value={
            isTauri
              ? downloadFolder || 'Using system Downloads folder'
              : 'Browser: uses system Downloads folder'
          }
          readOnly
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onChooseFolder}
          disabled={!isTauri}
        >
          <FolderOpen className="size-4" />
          {isTauri ? 'Choose Folder' : 'Desktop app only'}
        </Button>
      </div>
      <FieldDescription className="text-xs">
        Used by the desktop app to save downloaded files (email batches, drafts,
        exports). In a regular browser, your default Downloads folder is always
        used.
      </FieldDescription>
    </Field>
  );
}
