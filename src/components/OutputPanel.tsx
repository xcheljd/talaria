/**
 * OutputPanel — Displays generated message with Preview/Text tabs.
 * Includes subject line input, Copy/Download buttons, and toast notifications.
 */

import { useState, useCallback } from 'react';
import { Copy, Download, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { templates, isHTMLContent, type TemplateResult } from '@/lib/templates';
import { createEMLFile } from '@/lib/emailUtils';
import { getEmployeeSignature } from '@/lib/signature';
import { plainTextToPreviewHTML } from '@/lib/emailPreviewUtils';
import { getUserProfile } from '@/lib/profile';
import { getRecommendedFormat } from '@/lib/ui-utils';
import { saveBlob } from '@/lib/file-save';

import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailPreview } from '@/components/EmailPreview';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutputPanelProps {
  templateKey: string | null;
  templateResult: TemplateResult | null;
  bodyContent: string | null; // body without signature
  fullTextContent: string | null; // body + signature for text tab
  subjectLine: string;
  onSubjectChange: (subject: string) => void;
  onClear: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutputPanel({
  templateKey,
  templateResult,
  bodyContent,
  fullTextContent,
  subjectLine,
  onSubjectChange,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('preview');

  const template = templateKey ? templates[templateKey] : null;
  const hasContent = !!bodyContent;
  const includeSignature = templateResult?.includeSignature !== false;

  // ─── Copy handler ──────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const textToCopy = bodyContent || '';
    if (!textToCopy) {
      toast.warning('Nothing to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Copied to clipboard!');
    } catch {
      // Fallback for older browsers
      try {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = textToCopy;
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.opacity = '0';
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        if (success) {
          toast.success('Copied to clipboard!');
        } else {
          toast.error('Copy failed');
        }
      } catch {
        toast.error('Copy not supported');
      }
    }
  }, [bodyContent]);

  // ─── Download EML handler ─────────────────────────────────────────────────

  const handleDownloadEML = useCallback(async () => {
    if (!templateKey || !template) return;

    const useBodyContent = bodyContent || (templateResult?.body ?? '');
    const subject = subjectLine || '';
    const isHTML = isHTMLContent(useBodyContent);

    let htmlBody: string;

    if (isHTML) {
      htmlBody = useBodyContent;
    } else {
      const htmlBodyContent = plainTextToPreviewHTML(useBodyContent);
      const htmlSignature = includeSignature
        ? getEmployeeSignature('html')
        : '';

      htmlBody = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body>
<div dir="ltr" style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">
${htmlBodyContent}
</div>${
        htmlSignature
          ? `
<div id="ms-outlook-mobile-signature">
${htmlSignature}
</div>`
          : ''
      }
</body>
</html>`;
    }

    const profile = getUserProfile();
    const fromName = profile?.employeeName || 'Citizen Company Store';
    const fromEmail = profile?.storeEmail || 'store@citizenwatchgroup.com';

    try {
      const emlContent = await createEMLFile(
        fromName,
        fromEmail,
        '',
        '',
        subject,
        htmlBody,
        []
      );

      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const format = getRecommendedFormat();
      const extension = format === 'emltpl' ? '.emltpl' : '.eml';
      await saveBlob(blob, `${safeSubject}${extension}`);
      toast.success('Email file downloaded!');
    } catch (error) {
      console.error('Error creating EML file:', error);
      toast.error('Failed to create email file');
    }
  }, [
    templateKey,
    template,
    bodyContent,
    templateResult,
    subjectLine,
    includeSignature,
  ]);

  if (!templateKey) return null;

  const hasEnhancedFeatures = template?.hasEditableSubject;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Generated Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject line input (for enhanced templates) */}
        {hasEnhancedFeatures && (
          <div className="space-y-1.5">
            <Label htmlFor="subjectLine" className="text-sm font-medium">
              Subject
            </Label>
            <div className="flex items-center gap-2">
              <ClearableInput
                id="subjectLine"
                value={subjectLine}
                onChange={onSubjectChange}
                placeholder="Enter a subject line..."
                className="flex-1"
              />
              {subjectLine && (
                <Badge variant="secondary" className="shrink-0">
                  {subjectLine.length}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Preview / Text tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="mr-1.5 h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1">
              <FileText className="mr-1.5 h-4 w-4" />
              Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="min-h-[300px] rounded-md border bg-background p-4">
              <EmailPreview
                bodyContent={bodyContent}
                includeSignature={includeSignature}
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <textarea
              className="min-h-[300px] w-full rounded-md border bg-background p-4 font-mono text-sm"
              readOnly
              value={fullTextContent || ''}
              placeholder="Your generated message will appear here..."
              aria-label="Generated message output"
            />
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        {hasContent && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" onClick={handleCopy}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy Message
            </Button>
            {hasEnhancedFeatures && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadEML}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download Email File
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
