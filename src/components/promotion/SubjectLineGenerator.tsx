/**
 * SubjectLineGenerator — Subject line generation and selection for promotion email.
 *
 * Features:
 * - Generated from promotion content using pure function
 * - shadcn Select dropdown for selection
 * - Editable input with character count Badge
 * - Regenerate button
 *
 * Uses Zustand store for state management.
 */

import { useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import { usePromotionStore } from '@/stores/promotion-store';
import { generateSubjectLines } from '@/lib/subject-line-generator';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ===== Component =====

const OPTIMAL_LENGTH = 50;

export function SubjectLineGenerator() {
  const store = usePromotionStore();

  // Generate subject lines from promotion content
  const handleGenerate = useCallback(() => {
    const lines = generateSubjectLines({
      promoDateRange: '', // Will be filled from basic details when that card is implemented
      promotionEntries: store.promotionEntries,
    });
    store.setGeneratedSubjectLines(lines);
    if (lines.length > 0) {
      store.setSelectedSubjectLine(lines[0]);
    }
    store.setSubjectLineManuallyEdited(false);
  }, [store]);

  // Regenerate (clears manual edit flag)
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Select from dropdown
  const handleSelectSubject = useCallback(
    (value: string) => {
      const index = parseInt(value, 10);
      if (
        !isNaN(index) &&
        index >= 0 &&
        index < store.generatedSubjectLines.length
      ) {
        store.setSelectedSubjectLine(store.generatedSubjectLines[index]);
        store.setSubjectLineManuallyEdited(false);
      }
    },
    [store]
  );

  // Edit subject line input
  const handleSubjectEdit = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      store.setSelectedSubjectLine(e.target.value);
      store.setSubjectLineManuallyEdited(true);
    },
    [store]
  );

  // Character count for the selected subject
  const charCount = store.selectedSubjectLine?.length ?? 0;
  const isOptimal = charCount > 0 && charCount <= OPTIMAL_LENGTH;

  // No generated lines yet — show generate prompt
  const hasLines = store.generatedSubjectLines.length > 0;

  return (
    <div className="space-y-4">
      {store.promotionEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add discount entries first to generate subject line suggestions.
        </p>
      ) : !hasLines ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            Generate subject line suggestions from your promotion content.
          </p>
          <Button onClick={handleGenerate} size="sm">
            Generate Subject Lines
          </Button>
        </div>
      ) : (
        <>
          {/* Dropdown header with regenerate */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium">
              Choose a subject line suggestion:
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>

          {/* Select dropdown */}
          <Select
            value={
              store.generatedSubjectLines.indexOf(
                store.selectedSubjectLine || ''
              ) >= 0
                ? String(
                    store.generatedSubjectLines.indexOf(
                      store.selectedSubjectLine || ''
                    )
                  )
                : undefined
            }
            onValueChange={handleSelectSubject}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a subject line..." />
            </SelectTrigger>
            <SelectContent>
              {store.generatedSubjectLines.map((subject, index) => (
                <SelectItem key={index} value={String(index)}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Editable selected subject line */}
          {store.selectedSubjectLine !== null && (
            <div className="space-y-2">
              <label
                htmlFor="selected-subject-input"
                className="text-sm font-medium"
              >
                Selected Subject Line (customizable):
              </label>
              <div className="flex items-start gap-2">
                <Input
                  id="selected-subject-input"
                  value={store.selectedSubjectLine}
                  onChange={handleSubjectEdit}
                  placeholder="Your subject line..."
                  title="Edit the email subject line. Changes will be reflected in generated emails."
                  className="flex-1"
                />
                <Badge
                  variant={isOptimal ? 'default' : 'secondary'}
                  className="mt-1.5 shrink-0"
                >
                  {charCount} chars{' '}
                  {charCount > 0 &&
                    (isOptimal ? '✓' : `(>${OPTIMAL_LENGTH})`)}
                </Badge>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
