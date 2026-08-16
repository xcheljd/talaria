/**
 * GenerateWarningDialog — surfaced before generating email batches when some
 * recommended fields are empty. Split out of PreviewColumn.
 */

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

interface GenerateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnings: string[];
  onGenerateAnyway: () => void;
}

export function GenerateWarningDialog({
  open,
  onOpenChange,
  warnings,
  onGenerateAnyway,
}: GenerateWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Before you generate...</AlertDialogTitle>
          <AlertDialogDescription>
            The following fields were left empty. You can go back and fill them
            in, or generate anyway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-2 text-sm">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2">
              <span className="mt-0.5 text-warning">⚠</span>
              <span className="text-pretty">{w}</span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={onGenerateAnyway}>
            Generate Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
