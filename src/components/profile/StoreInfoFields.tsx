/**
 * StoreInfoFields — the "Brand Identity" block of the profile form.
 *
 * Company name, store name/location, address, plus code, phone, email, hours
 * and directions. Rendered as direct children of ProfileFormSection's grid, so
 * the `col-span` classes on the divider and header still apply.
 */

import type { UseFormReturn } from 'react-hook-form';

import type { ProfileFormValues } from '@/lib/profile-validation';
import { ClearableInput } from '@/components/ui/clearable-input';
import { ClearableTextarea } from '@/components/ui/clearable-textarea';
import { Separator } from '@/components/ui/separator';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface StoreInfoFieldsProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function StoreInfoFields({ form }: StoreInfoFieldsProps) {
  return (
    <>
      {/* Divider */}
      <Separator className="col-span-1 lg:col-span-2" />

      {/* Brand Identity header */}
      <div className="col-span-1 lg:col-span-2">
        <h3 className="text-sm font-semibold">Brand Identity</h3>
        <p className="text-xs text-muted-foreground">
          Your company name, what you sell, and the website links shown in your
          email signature. These make every template yours.
        </p>
      </div>

      {/* Company Name */}
      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Company Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="Acme Inc."
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Shown in email signatures and as the sender name in previews
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Name */}
      <FormField
        control={form.control}
        name="storeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Store Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="Acme Store - Orlando"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Include location if multiple stores
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Location */}
      <FormField
        control={form.control}
        name="storeLocation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Store Location <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="the Downtown Shopping Center"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Format: "the [Mall Name]" — Used in email signatures
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Address */}
      <FormField
        control={form.control}
        name="storeAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Store Address</FormLabel>
            <FormControl>
              <ClearableTextarea
                placeholder="123 Main Street&#10;City, State ZIP"
                className="min-h-[80px]"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Include street, city, state, and ZIP code
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Plus Code */}
      <FormField
        control={form.control}
        name="storePlusCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Google Plus Code (optional)</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="QXGV+2H"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Google Maps Plus Code for precise location
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Phone */}
      <FormField
        control={form.control}
        name="storePhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Store Phone <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                type="tel"
                placeholder="555-123-4567"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Format: 555-123-4567 or (555) 123-4567
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Email */}
      <FormField
        control={form.control}
        name="storeEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Store Email <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                type="email"
                placeholder="store@company.com"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Use your store email for non-management staff
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Hours */}
      <FormField
        control={form.control}
        name="storeHours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Store Hours <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <ClearableInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>
              Edit as needed for your store's specific hours
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Store Directions */}
      <FormField
        control={form.control}
        name="storeDirections"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Store Directions / Location Notes (optional)</FormLabel>
            <FormControl>
              <ClearableInput
                placeholder="e.g., Entrance E, near Polo Ralph Lauren"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>Used in promotion email template</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
