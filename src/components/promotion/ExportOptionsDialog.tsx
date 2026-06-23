/**
 * ExportOptionsDialog — choose what to embed in the exported template JSON
 * (bulk recipients, PDF file data). Split out of PreviewColumn.
 */

import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeRecipients: boolean;
  onIncludeRecipientsChange: (value: boolean) => void;
  includePdfData: boolean;
  onIncludePdfDataChange: (value: boolean) => void;
  onExport: () => void;
}

export function ExportOptionsDialog({
  open,
  onOpenChange,
  includeRecipients,
  onIncludeRecipientsChange,
  includePdfData,
  onIncludePdfDataChange,
  onExport,
}: ExportOptionsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export options</AlertDialogTitle>
          <AlertDialogDescription>
            Choose what to include in the exported template file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={includeRecipients}
              onCheckedChange={(c) => onIncludeRecipientsChange(c === true)}
              data-testid="export-include-recipients"
              className="mt-0.5"
            />
            <span className="text-sm">
              Include bulk email recipients
              <span className="block text-xs text-muted-foreground text-pretty">
                Embeds your recipient list (email addresses) in the file. Off by
                default.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={includePdfData}
              onCheckedChange={(c) => onIncludePdfDataChange(c === true)}
              data-testid="export-include-pdfs"
              className="mt-0.5"
            />
            <span className="text-sm">
              Include PDF attachments (files)
              <span className="block text-xs text-muted-foreground text-pretty">
                Embeds the actual PDF files so they restore on import. Increases
                file size. Unchecked exports names only.
              </span>
            </span>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onExport}>Export</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
