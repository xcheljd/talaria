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
import { RefreshCw, Mail, Star, Sparkles } from 'lucide-react';

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
    subject.length > maxSubject ? subject.slice(0, maxSubject) + '…' : subject;
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
              <span className="text-[11px] text-muted-foreground shrink-0">
                9:15 AM
              </span>
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

  // Generate preheader suggestions from promotion content
  const preheaderSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    const entries = store.promotionEntries.filter((e) => e.line?.trim());
    const dateRange = store.promoDateRange;

    if (dateRange && entries.length > 0) {
      suggestions.push(
        `${dateRange} — ${entries.map((e) => e.line).join(', ')}`
      );
    }
    if (entries.length > 0) {
      suggestions.push(
        `Don't miss out: ${entries.slice(0, 2).map((e) => e.line).join(' + ')}`
      );
    }
    if (dateRange) {
      suggestions.push(
        `Exclusive savings ${dateRange} — while supplies last`
      );
    }
    if (entries.length > 0) {
      suggestions.push(
        `Shop ${entries.length} deal${entries.length > 1 ? 's' : ''} inside — limited availability`
      );
    }
    suggestions.push('Preview your promotion deals and savings inside.');
    return suggestions;
  }, [store.promoDateRange, store.promotionEntries]);

  // Preheader for inbox preview — custom text or auto-generated fallback
  const preheaderDisplay = store.preheaderText.trim() || preheaderSuggestions[0];

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

          {/* Preheader Text */}
          <div className="space-y-1.5">
            <label
              htmlFor="preheader-input"
              className="text-sm font-medium"
            >
              Preheader Text (preview text):
            </label>
            <ClearableInput
              id="preheader-input"
              value={store.preheaderText}
              onChange={(val) => store.setPreheaderText(val)}
              placeholder="Text shown after subject in inbox..."
              title="Preview text shown after the subject line in email client inbox views. Keep it under 100 characters."
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  store.preheaderText.length > 0 &&
                  store.preheaderText.length <= 100
                    ? 'default'
                    : 'secondary'
                }
                className="text-xs"
              >
                {store.preheaderText.length} / 100 chars
              </Badge>
            </div>

            {/* Preheader suggestions */}
            {!store.preheaderText.trim() && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Suggestions (click to use):
                </p>
                <div className="flex flex-wrap gap-1">
                  {preheaderSuggestions.slice(0, 4).map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-left text-[11px] rounded border px-2 py-1 hover:bg-accent transition-colors truncate max-w-full"
                      onClick={() => store.setPreheaderText(suggestion)}
                      title={suggestion}
                    >
                      {suggestion.length > 60
                        ? suggestion.slice(0, 60) + '…'
                        : suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inbox Preview */}
          {store.selectedSubjectLine && (
            <InboxPreview
              subject={store.selectedSubjectLine}
              preheader={preheaderDisplay}
            />
          )}
        </>
      )}
    </div>
  );
}
