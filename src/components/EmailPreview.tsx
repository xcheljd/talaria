/**
 * EmailPreview — Renders the email message as HTML in the preview pane.
 * Displays body content plus an optional HTML signature.
 * Uses a contenteditable div for preview consistency.
 */

import { useMemo } from 'react';
import { Mail } from 'lucide-react';

import { plainTextToPreviewHTML } from '@/lib/emailPreviewUtils';
import { getEmployeeSignature } from '@/lib/signature';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailPreviewProps {
  bodyContent: string | null;
  includeSignature: boolean;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyPreviewState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Mail className="mb-4 h-16 w-16 opacity-30" />
      <h3 className="mb-1 text-lg font-medium">No Preview Yet</h3>
      <p className="text-sm">Content will appear here when you generate a message</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailPreview({
  bodyContent,
  includeSignature,
}: EmailPreviewProps) {
  const previewHtml = useMemo(() => {
    if (!bodyContent) return null;

    // Convert body text to HTML
    const htmlBody = plainTextToPreviewHTML(bodyContent, { forPreview: true });

    // Get HTML signature if needed
    const htmlSignature = includeSignature
      ? getEmployeeSignature('html', { forPreview: true })
      : '';

    const signatureHtml = htmlSignature
      ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${htmlSignature}
</div>`
      : '';

    return `<div>${htmlBody}</div>${signatureHtml}`;
  }, [bodyContent, includeSignature]);

  if (!previewHtml) {
    return <EmptyPreviewState />;
  }

  return (
    <div
      className="email-preview prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );
}
