/**
 * BrandLinksEditor — repeatable name/URL rows for the email signature footer.
 *
 * The field array itself is owned by ProfileSettingsPage (it has to survive
 * switching sidebar sections, which unmounts this editor), so the rows and the
 * append/remove callbacks arrive as props.
 */

import { Plus, Trash2 } from 'lucide-react';
import type {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from 'react-hook-form';

import type { ProfileFormValues } from '@/lib/profile-validation';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface BrandLinksEditorProps {
  form: UseFormReturn<ProfileFormValues>;
  brandLinkFields: FieldArrayWithId<ProfileFormValues, 'brandLinks', 'id'>[];
  appendBrandLink: UseFieldArrayAppend<ProfileFormValues, 'brandLinks'>;
  removeBrandLink: UseFieldArrayRemove;
}

export function BrandLinksEditor({
  form,
  brandLinkFields,
  appendBrandLink,
  removeBrandLink,
}: BrandLinksEditorProps) {
  return (
    <div className="col-span-1 space-y-2 lg:col-span-2">
      <div>
        <FormLabel>Signature Brand Links (optional)</FormLabel>
        <p className="text-xs text-muted-foreground">
          Website links shown in your email signature footer. Add one per brand
          or site you want to link.
        </p>
      </div>

      {brandLinkFields.length > 0 && (
        <div className="space-y-2">
          {brandLinkFields.map((linkField, index) => (
            <div
              key={linkField.id}
              className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start"
            >
              <FormField
                control={form.control}
                name={`brandLinks.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <ClearableInput
                        placeholder="Brand name"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`brandLinks.${index}.url`}
                render={({ field }) => (
                  <FormItem className="flex-[2]">
                    <FormControl>
                      <ClearableInput
                        type="url"
                        placeholder="https://www.brand.com/"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBrandLink(index)}
                aria-label="Remove brand link"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => appendBrandLink({ name: '', url: '' })}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add brand link
      </Button>
    </div>
  );
}
