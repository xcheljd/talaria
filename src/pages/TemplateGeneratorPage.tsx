/**
 * TemplateGeneratorPage — Main page for the template generator.
 * Migrated from index.html vanilla JS.
 *
 * Features:
 * - Searchable template selector (shadcn Command/Combobox)
 * - Dynamic form fields driven by templates.js fieldConfig (React Hook Form)
 * - Generate/Clear buttons (shadcn Button)
 * - Output panel with Preview/Text tabs (shadcn Tabs)
 * - Email preview component (HTML-rendered)
 * - Subject line input with character count (Input + Badge)
 * - Copy/Download buttons with toast notifications (Sonner)
 */

import { useState, useCallback, useEffect } from 'react';

import {
  templates,
  getEmployeeSignature,
  type TemplateResult,
} from '@/lib/templates';

import type { TemplateFormValues } from '@/components/TemplateFormFields';

import { StorageKeys } from '@/lib/storage-keys';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateSelector } from '@/components/TemplateSelector';
import { TemplateFormFields } from '@/components/TemplateFormFields';
import { OutputPanel } from '@/components/OutputPanel';

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateGeneratorPage() {
  // ─── State ───────────────────────────────────────────────────────────────

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    () => {
      // Restore previously selected template from localStorage
      const saved = localStorage.getItem(StorageKeys.selectedTemplate);
      return saved && templates[saved] ? saved : null;
    }
  );

  const [templateResult, setTemplateResult] = useState<TemplateResult | null>(
    null
  );
  const [bodyContent, setBodyContent] = useState<string | null>(null);
  const [fullTextContent, setFullTextContent] = useState<string | null>(null);
  const [subjectLine, setSubjectLine] = useState<string>('');

  // ─── Persist selected template ───────────────────────────────────────────

  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem(StorageKeys.selectedTemplate, selectedTemplate);
    } else {
      localStorage.removeItem(StorageKeys.selectedTemplate);
    }
  }, [selectedTemplate]);

  // ─── Template selection ──────────────────────────────────────────────────

  const handleTemplateChange = useCallback((key: string | null) => {
    setSelectedTemplate(key);
    // Clear output when template changes
    setTemplateResult(null);
    setBodyContent(null);
    setFullTextContent(null);
    setSubjectLine('');
  }, []);

  // ─── Generate message ───────────────────────────────────────────────────

  const handleGenerate = useCallback(
    (data: TemplateFormValues) => {
      if (!selectedTemplate) return;

      const template = templates[selectedTemplate];
      if (!template) return;

      try {
        const result = template.generate(data);

        // Extract subject from body
        const bodyWithSubject = result.body;
        let subject = '';
        let bodyWithoutSubject = bodyWithSubject;
        const subjectMatch = bodyWithSubject.match(/^Subject:\s*(.+)/m);
        if (subjectMatch) {
          subject = subjectMatch[1];
          bodyWithoutSubject = bodyWithSubject
            .replace(/^Subject:.+\n/, '')
            .trim();
        }

        setSubjectLine(subject);
        setTemplateResult({
          body: bodyWithoutSubject,
          includeSignature: result.includeSignature,
        });
        setBodyContent(bodyWithoutSubject);

        // Build full text with signature
        const includeSignature = result.includeSignature !== false;
        if (includeSignature) {
          setFullTextContent(
            `${bodyWithoutSubject}\n${getEmployeeSignature('text')}`
          );
        } else {
          setFullTextContent(bodyWithoutSubject);
        }
      } catch (error) {
        console.error('Error generating message:', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error generating message';
        // Use toast via event since we don't want to import toast in this module
        // The OutputPanel handles toast for copy/download
        alert(`Error generating message: ${message}`);
      }
    },
    [selectedTemplate]
  );

  // ─── Clear output ───────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setTemplateResult(null);
    setBodyContent(null);
    setFullTextContent(null);
    setSubjectLine('');
  }, []);

  // ─── Subject line change ─────────────────────────────────────────────────

  const handleSubjectChange = useCallback((newSubject: string) => {
    setSubjectLine(newSubject);
  }, []);

  // ─── Template info ──────────────────────────────────────────────────────

  const currentTemplate = selectedTemplate ? templates[selectedTemplate] : null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Template</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateSelector
            value={selectedTemplate}
            onValueChange={handleTemplateChange}
          />
        </CardContent>
      </Card>

      {/* Form Fields (shown when template selected) */}
      {selectedTemplate && currentTemplate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {currentTemplate.name} Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateFormFields
              templateKey={selectedTemplate}
              onSubmit={handleGenerate}
              onClear={handleClear}
            />
          </CardContent>
        </Card>
      )}

      {/* Output Panel */}
      {selectedTemplate && (
        <OutputPanel
          templateKey={selectedTemplate}
          templateResult={templateResult}
          bodyContent={bodyContent}
          fullTextContent={fullTextContent}
          subjectLine={subjectLine}
          onSubjectChange={handleSubjectChange}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
