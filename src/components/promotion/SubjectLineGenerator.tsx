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

import { useCallback, useMemo } from 'react';
import { RefreshCw, Mail, Star } from 'lucide-react';

import { usePromotionStore } from '@/stores/promotion-store';
import { generateSubjectLines } from '@/lib/subject-line-generator';

import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ===== Inbox Preview =====

function InboxPreview({
  subject,
  preheader,
}: {
  subject: string;
  preheader: string;
}) {
  // Simulate truncation like real inbox clients
  const maxSubject = 60;
  const maxPreheader = 80;
  const truncatedSubject =
    subject.length > maxSubject
      ? subject.slice(0, maxSubject) + '…'
      : subject;
  const truncatedPreheader =
    preheader.length > maxPreheader
      ? preheader.slice(0, maxPreheader) + '…'
      : preheader;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Inbox Preview
      </label>
      <div
        className="rounded-lg border bg-background overflow-hidden"
        data-testid="inbox-preview"
      >
        {/* Mock inbox row */}
        <div className="flex items-start gap-3 px-3 py-2.5 border-l-2 border-l-blue-500 bg-accent/40">
          <div className="flex items-center gap-2 pt-0.5 shrink-0">
            <Star className="h-3.5 w-3.5 text-muted-foreground/40" />
            <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">CW</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold truncate">
                Citizen Watch Company
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                10:30 AM
              </span>
            </div>
            <p className="text-sm font-medium truncate text-foreground">
              {truncatedSubject || 'No subject'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {truncatedPreheader || 'No preview text available'}
            </p>
          </div>
        </div>

        {/* Dim row for context */}
        <div className="flex items-start gap-3 px-3 py-2 opacity-40">
          <div className="flex items-center gap-2 pt-0.5 shrink-0">
            <Star className="h-3.5 w-3.5 text-muted-foreground/40" />
            <div className="h-7 w-7 rounded-full bg-gray-400 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">NR</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm truncate">No-Reply</span>
              <span className="text-[11px] text-muted-foreground shrink-0">9:15 AM</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Your account settings have been updated
            </p>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        <Mail className="inline h-3 w-3 mr-0.5 -mt-0.5" />
        Simulated inbox view — actual rendering varies by email client
      </p>
    </div>
  );
}

// ===== Component =====

const OPTIMAL_LENGTH = 50;

export function SubjectLineGenerator() {
  const store = usePromotionStore();

  // Generate subject lines from promotion content
  const handleGenerate = useCallback(() => {
    const lines = generateSubjectLines({
      promoDateRange: store.promoDateRange,
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
    (val: string) => {
      store.setSelectedSubjectLine(val);
      store.setSubjectLineManuallyEdited(true);
    },
    [store]
  );

  // Character count for the selected subject
  const charCount = store.selectedSubjectLine?.length ?? 0;
  const isOptimal = charCount > 0 && charCount <= OPTIMAL_LENGTH;

  // Build preheader from promotion context
  const preheader = useMemo(() => {
    const parts: string[] = [];
    if (store.promoDateRange) parts.push(store.promoDateRange);
    // Use first couple promotion entry summaries
    for (const entry of store.promotionEntries.slice(0, 2)) {
      if (entry.line) parts.push(entry.line);
    }
    return parts.join(' — ') || 'Preview your promotion deals and savings inside.';
  }, [store.promoDateRange, store.promotionEntries]);

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
            <div className="space-y-1.5">
              <label
                htmlFor="selected-subject-input"
                className="text-sm font-medium"
              >
                Selected Subject Line (customizable):
              </label>
              <ClearableInput
                id="selected-subject-input"
                value={store.selectedSubjectLine}
                onChange={handleSubjectEdit}
                placeholder="Your subject line..."
                title="Edit the email subject line. Changes will be reflected in generated emails."
                className="w-full"
              />
              <Badge
                variant={isOptimal ? 'default' : 'secondary'}
                className="text-xs"
              >
                {charCount} chars{' '}
                {charCount > 0 && (isOptimal ? '✓' : `(>${OPTIMAL_LENGTH})`)}
              </Badge>
            </div>
          )}

          {/* Inbox Preview */}
          {store.selectedSubjectLine && (
            <InboxPreview
              subject={store.selectedSubjectLine}
              preheader={preheader}
            />
          )}
        </>
      )}
    </div>
  );
}
