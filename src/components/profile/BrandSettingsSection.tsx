/**
 * BrandSettingsSection — the "Keywords" sidebar section's form fields.
 *
 * Brand and collection names the subject-line generator can feature. Rendered
 * inside the shared <Form>/<form> element owned by ProfileSettingsPage, so
 * these values save with the rest of the profile.
 */

import type { UseFormReturn } from 'react-hook-form';

import type { ProfileFormValues } from '@/lib/profile-validation';
import { ClearableInput } from '@/components/ui/clearable-input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface BrandSettingsSectionProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function BrandSettingsSection({ form }: BrandSettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
      {/* Subject line keywords header */}
      <div className="col-span-1 lg:col-span-2">
        <h3 className="text-sm font-semibold">Subject Line Keywords</h3>
        <p className="text-xs text-muted-foreground">
          Brand and collection names the subject-line generator can feature in
          suggestions (e.g. "Spring Aria Sale"). Separate multiple values with
          commas.
        </p>
      </div>

      {/* Brand keywords */}
      <FormField
        control={form.control}
        name="brandKeywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand keywords</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="Acme, Zenith, Meridian"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>Comma-separated</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Collection keywords */}
      <FormField
        control={form.control}
        name="collectionKeywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Collection keywords</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="Aria, Volt, Tide"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>Comma-separated</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
