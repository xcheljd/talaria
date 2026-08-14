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
import { Label } from '@/components/ui/label';

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
    <div className="col-span-1 lg:col-span-2">
      <Label className="mb-2 block">Download Folder (Desktop app)</Label>
      <div className="flex items-center gap-2">
        <Input
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
          <FolderOpen className="mr-1 h-4 w-4" />
          {isTauri ? 'Choose Folder' : 'Desktop app only'}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Used by the desktop app to save downloaded files (email batches, drafts,
        exports). In a regular browser, your default Downloads folder is always
        used.
      </p>
    </div>
  );
}
