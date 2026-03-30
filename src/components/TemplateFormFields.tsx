/**
 * TemplateFormFields — Dynamic form fields driven by template fieldConfig.
 * Auto-populates from profile data. Uses React Hook Form for state management.
 */

import { useForm } from 'react-hook-form';

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
import { ClearableInput } from '@/components/ui/clearable-input';
import { ClearableTextarea } from '@/components/ui/clearable-textarea';
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
                <ClearableTextarea
                  id={field}
                  placeholder={config.example || ''}
                  value={currentValue}
                  onChange={(val: string) => setValue(field, val)}
                  className="min-h-[80px]"
                />
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
                    <ClearableInput
                      id={field}
                      type="text"
                      placeholder={config.example || ''}
                      value={currentValue}
                      onChange={(val: string) => setValue(field, val)}
                      list={`datalist-${field}`}
                    />
                    <datalist id={`datalist-${field}`}>
                      {suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <ClearableInput
                    id={field}
                    type="text"
                    placeholder={config.example || ''}
                    value={currentValue}
                    onChange={(val: string) => setValue(field, val)}
                  />
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
