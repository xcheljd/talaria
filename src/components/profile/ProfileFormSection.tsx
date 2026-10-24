/**
 * ProfileFormSection — the "Profile" sidebar section's form fields.
 *
 * Who you are (your name), the
 * brand identity block (StoreInfoFields), and what you sell. Rendered
 * inside the shared <Form>/<form>
 * element owned by ProfileSettingsPage.
 */

import type { UseFormReturn } from 'react-hook-form';

import type { ProfileFormValues } from '@/lib/profile-validation';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Separator } from '@/components/ui/separator';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { StoreInfoFields } from '@/components/profile/StoreInfoFields';

interface ProfileFormSectionProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function ProfileFormSection({ form }: ProfileFormSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 lg:grid-cols-2">
      {/* Employee Name */}
      <FormField
        control={form.control}
        name="employeeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Your Name <span className="text-destructive-text">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="e.g., John Smith"
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

      <StoreInfoFields form={form} />

      {/* Divider */}
      <Separator className="col-span-1 lg:col-span-2" />

      {/* What you sell header */}
      <div className="col-span-1 lg:col-span-2">
        <h2 className="text-sm font-semibold">What You Sell</h2>
        <p className="text-xs text-muted-foreground">
          The word for your product is woven into email copy and subject lines
          (e.g. "Your New Watch Awaits"). Leave blank to use the neutral default
          ("product").
        </p>
      </div>

      {/* Product Noun (singular) */}
      <FormField
        control={form.control}
        name="productNoun"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product name (singular)</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="watch"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>e.g. watch, candle, bag</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product Noun (plural) */}
      <FormField
        control={form.control}
        name="productNounPlural"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product name (plural)</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="watches"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>e.g. watches, candles, bags</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand Links editor */}
    </div>
  );
}
