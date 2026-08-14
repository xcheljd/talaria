/**
 * ProfileFormSection — the "Profile" sidebar section's form fields.
 *
 * Who you are (name, job title, company email for management titles), the
 * brand identity block (StoreInfoFields), what you sell, and the signature
 * brand links (BrandLinksEditor). Rendered inside the shared <Form>/<form>
 * element owned by ProfileSettingsPage.
 */

import type {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from 'react-hook-form';

import { type ProfileFormValues, JOB_TITLES } from '@/lib/profile-validation';
import { ClearableInput } from '@/components/ui/clearable-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { BrandLinksEditor } from '@/components/profile/BrandLinksEditor';

interface ProfileFormSectionProps {
  form: UseFormReturn<ProfileFormValues>;
  showCompanyEmail: boolean;
  brandLinkFields: FieldArrayWithId<ProfileFormValues, 'brandLinks', 'id'>[];
  appendBrandLink: UseFieldArrayAppend<ProfileFormValues, 'brandLinks'>;
  removeBrandLink: UseFieldArrayRemove;
}

export function ProfileFormSection({
  form,
  showCompanyEmail,
  brandLinkFields,
  appendBrandLink,
  removeBrandLink,
}: ProfileFormSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
      {/* Employee Name */}
      <FormField
        control={form.control}
        name="employeeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Your Name <span className="text-destructive">*</span>
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

      {/* Job Title */}
      <FormField
        control={form.control}
        name="jobTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Job Title <span className="text-destructive">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your job title..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {JOB_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Company Email (conditional) */}
      {showCompanyEmail && (
        <FormField
          control={form.control}
          name="companyEmail"
          render={({ field }) => (
            <FormItem className="col-span-1 lg:col-span-2">
              <FormLabel>
                Company Email <span className="text-destructive">*</span>
              </FormLabel>
              <div className="mx-auto max-w-[50%]">
                <FormControl>
                  <ClearableInput
                    type="email"
                    placeholder="your.name@company.com"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-center">
                Required for management positions — Used in email signatures for
                managers and above
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <StoreInfoFields form={form} />

      {/* Divider */}
      <Separator className="col-span-1 lg:col-span-2" />

      {/* What you sell header */}
      <div className="col-span-1 lg:col-span-2">
        <h3 className="text-sm font-semibold">What You Sell</h3>
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
      <BrandLinksEditor
        form={form}
        brandLinkFields={brandLinkFields}
        appendBrandLink={appendBrandLink}
        removeBrandLink={removeBrandLink}
      />
    </div>
  );
}
