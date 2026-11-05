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
  NEWSLETTER_THEMES,
  THEME_LABELS,
  THEME_PHRASES,
} from '@/lib/newsletter-themes';
import { THEME_FIELDS } from '@/components/profile/profile-form-utils';
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
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 lg:grid-cols-2">
      {/* Subject line keywords header */}
      <div className="col-span-1 lg:col-span-2">
        <h2 className="text-sm font-semibold">Subject Line Keywords</h2>
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

      {/* Newsletter theme phrases */}
      <div className="col-span-1 mt-2 border-t pt-4 lg:col-span-2">
        <h2 className="text-sm font-semibold">Newsletter Theme Phrases</h2>
        <p className="text-xs text-muted-foreground">
          When your newsletter uses one of these phrases, subject suggestions
          pick up the theme (e.g. "Just In: Aria Volt"). Common phrases are
          built in; add your store&apos;s own wording here.
        </p>
      </div>
      {NEWSLETTER_THEMES.map((theme) => (
        <FormField
          key={theme}
          control={form.control}
          name={THEME_FIELDS[theme]}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{THEME_LABELS[theme]}</FormLabel>
              <FormControl>
                <ClearableInput
                  placeholder="Your own phrases, comma-separated"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Built in: {THEME_PHRASES[theme].slice(0, 4).join(', ')}…
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
