/**
 * TemplateFormFields — Dynamic form fields driven by template fieldConfig.
 * Auto-populates from profile data. Uses React Hook Form for state management.
 */

import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

import {
  templates,
  fieldConfig,
  getFieldSuggestions,
  isYesNoField,
  isTextareaField,
  formatFieldLabel,
} from '@/lib/templates';
import { useProfile } from '@/contexts/ProfileProvider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateFormValues {
  [field: string]: string;
}

interface TemplateFormFieldsProps {
  templateKey: string;
  onSubmit: (data: TemplateFormValues) => void;
  onClear: () => void;
}

// ─── Profile auto-fill mapping ────────────────────────────────────────────────

function getProfileAutoFill(
  field: string,
  profile: ReturnType<typeof useProfile>['profile']
): string {
  if (!profile) return '';

  switch (field) {
    case 'employeeName':
    case 'yourName':
      return profile.employeeName || '';
    case 'storePhone':
      return profile.storePhone || '';
    case 'storeName':
      return profile.storeName || '';
    case 'storeLocation':
      return profile.storeLocation || '';
    case 'storeEmail':
      return profile.storeEmail || '';
    default:
      return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateFormFields({
  templateKey,
  onSubmit,
  onClear,
}: TemplateFormFieldsProps) {
  const { profile } = useProfile();
  const template = templates[templateKey];

  const defaultValues: TemplateFormValues = {};
  if (template) {
    template.fields.forEach((field) => {
      const autoFill = getProfileAutoFill(field, profile);
      defaultValues[field] = autoFill;
    });
  }

  const { register, handleSubmit, reset, watch, setValue } =
    useForm<TemplateFormValues>({
      defaultValues,
    });

  // Watch all fields for clear button visibility
  const watchedFields = template ? watch(template.fields) : [];

  if (!template) return null;

  const handleFormSubmit = (data: TemplateFormValues) => {
    onSubmit(data);
  };

  const handleClear = () => {
    // Reset to profile defaults (not completely empty)
    const defaults: TemplateFormValues = {};
    template.fields.forEach((field) => {
      defaults[field] = getProfileAutoFill(field, profile);
    });
    reset(defaults);
    onClear();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {template.fields.map((field, index) => {
          const config = fieldConfig[field] || {};
          const label = formatFieldLabel(field);
          const isTextarea = isTextareaField(field);
          const isRadio = isYesNoField(field);
          const suggestions = getFieldSuggestions(field);
          const currentValue = watchedFields[index] || '';

          // Yes/No radio field
          if (isRadio) {
            return (
              <div key={field} className="space-y-2">
                <Label className="text-sm font-medium">
                  {label}
                  {config.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      value="Yes"
                      {...register(field)}
                      className="accent-primary"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      value="No"
                      {...register(field)}
                      className="accent-primary"
                    />
                    No
                  </label>
                </div>
              </div>
            );
          }

          // Textarea field
          if (isTextarea) {
            return (
              <div key={field} className="space-y-2 sm:col-span-2">
                <Label htmlFor={field} className="text-sm font-medium">
                  {label}
                  {config.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Textarea
                    id={field}
                    placeholder={config.example || ''}
                    {...register(field)}
                    className="min-h-[80px] pr-8"
                  />
                  {currentValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setValue(field, '')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          // Regular input field
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor={field} className="text-sm font-medium">
                {label}
                {config.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <div className="relative">
                {suggestions.length > 0 ? (
                  <>
                    <Input
                      id={field}
                      type="text"
                      placeholder={config.example || ''}
                      {...register(field)}
                      list={`datalist-${field}`}
                      className="pr-8"
                    />
                    <datalist id={`datalist-${field}`}>
                      {suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <Input
                    id={field}
                    type="text"
                    placeholder={config.example || ''}
                    {...register(field)}
                    className="pr-8"
                  />
                )}
                {currentValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setValue(field, '')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex gap-2">
        <Button type="submit" size="default">
          Generate
        </Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
