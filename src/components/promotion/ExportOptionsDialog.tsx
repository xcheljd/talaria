/**
 * ExportOptionsDialog — choose what to embed in the exported template JSON
 * (bulk recipients, PDF file data). Split out of PreviewColumn.
 */

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
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
        <FieldGroup className="gap-4">
          <Field orientation="horizontal" className="items-start">
            <Checkbox
              id="export-include-recipients"
              checked={includeRecipients}
              onCheckedChange={(c) => onIncludeRecipientsChange(c === true)}
              data-testid="export-include-recipients"
            />
            <FieldContent>
              <FieldLabel htmlFor="export-include-recipients">
                Include bulk email recipients
              </FieldLabel>
              <FieldDescription className="text-xs text-pretty">
                Embeds your recipient list (email addresses) in the file. Off by
                default.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal" className="items-start">
            <Checkbox
              id="export-include-pdfs"
              checked={includePdfData}
              onCheckedChange={(c) => onIncludePdfDataChange(c === true)}
              data-testid="export-include-pdfs"
            />
            <FieldContent>
              <FieldLabel htmlFor="export-include-pdfs">
                Include PDF attachments (files)
              </FieldLabel>
              <FieldDescription className="text-xs text-pretty">
                Embeds the actual PDF files so they restore on import. Increases
                file size. Unchecked exports names only.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onExport}>Export</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
