/**
 * Profile validation utilities and Zod schema.
 * Migrated from src/js/start-app.js validation functions.
 * Pure functions with no React dependencies.
 */

import { z } from 'zod/v4';

// ─── Job Title Constants ──────────────────────────────────────────────────────

export const JOB_TITLES = [
  'Sales Associate',
  'Sales Associate/Keyholder',
  'Assistant Store Manager',
  'Associate Store Manager',
  'General Manager',
  'Area Manager',
  'Regional Manager',
  'District Manager',
] as const;

export const MANAGEMENT_TITLES = [
  'Assistant Store Manager',
  'Associate Store Manager',
  'General Manager',
  'Area Manager',
  'Regional Manager',
  'District Manager',
] as const;

/**
 * Check if a job title requires a company email address.
 */
export function requiresCompanyEmail(jobTitle: string): boolean {
  return (MANAGEMENT_TITLES as readonly string[]).includes(jobTitle);
}

// ─── Validation Helpers (migrated from start-app.js) ──────────────────────────

/**
 * Validate and format a phone number.
 */
export function validatePhone(phone: string): {
  isValid: boolean;
  formatted: string;
  error: string | null;
} {
  const digitsOnly = phone.replace(/\D/g, '');
  const isValid = digitsOnly.length === 10;

  return {
    isValid,
    formatted: isValid ? formatPhone(digitsOnly) : phone,
    error: !isValid ? 'Phone must have 10 digits' : null,
  };
}

/**
 * Format 10 digit string into (XXX) XXX-XXXX.
 */
export function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Validate an email address.
 */
export function validateEmail(email: string): {
  isValid: boolean;
  isCitizenEmail: boolean;
  error: string | null;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const citizenRegex = /^[^\s@]+@citizenwatchgroup\.com$/;

  return {
    isValid: emailRegex.test(email),
    isCitizenEmail: citizenRegex.test(email),
    error: !emailRegex.test(email) ? 'Invalid email format' : null,
  };
}

/**
 * Validate store hours format.
 */
export function validateStoreHours(hours: string): {
  isValid: boolean;
  error: string | null;
} {
  if (!hours || hours.trim() === '') {
    return {
      isValid: false,
      error: 'Store hours are required',
    };
  }

  const hasDays = /[A-Za-z]{3}/.test(hours);
  const hasTimes = /\d{1,2}(?::\d{2})?[AP]M/i.test(hours);

  return {
    isValid: hasDays && hasTimes,
    error:
      !hasDays && !hasTimes
        ? 'Include day names and hours'
        : !hasDays
          ? 'Include day names (Mon, Tue, etc.)'
          : !hasTimes
            ? 'Include opening/closing times (10AM-8PM or 10:00AM-8:00PM)'
            : null,
  };
}

/**
 * Validate an optional Google Plus Code.
 */
export function validatePlusCode(plusCode: string): {
  isValid: boolean;
  formatted?: string;
  error: string | null;
} {
  if (!plusCode || plusCode.trim() === '') {
    return { isValid: true, error: null }; // Optional field
  }

  const plusCodeRegex = /^[A-Z0-9]{2,4}\+[A-Z0-9]{2,3}$/i;
  const trimmed = plusCode.trim().toUpperCase();

  return {
    isValid: plusCodeRegex.test(trimmed),
    formatted: trimmed,
    error: !plusCodeRegex.test(trimmed)
      ? 'Invalid Plus Code format (e.g., 849VCWC8+R9)'
      : null,
  };
}

/**
 * Validate company email for management positions.
 */
export function validateCompanyEmail(
  email: string,
  jobTitle: string
): { isValid: boolean; error: string | null } {
  if (!requiresCompanyEmail(jobTitle)) {
    return { isValid: true, error: null };
  }

  if (!email || email.trim() === '') {
    return {
      isValid: false,
      error: 'Company email is required for management positions',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const citizenRegex = /^[^\s@]+@citizenwatchgroup\.com$/i;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  if (!citizenRegex.test(email)) {
    return {
      isValid: false,
      error: 'Company email must be @citizenwatchgroup.com',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

/**
 * Custom Zod refinements for profile-specific validation.
 */

/** Phone validation: must have exactly 10 digits */
export const phoneSchema = z.string().refine(
  (val) => {
    const digits = val.replace(/\D/g, '');
    return digits.length === 10;
  },
  { message: 'Phone must have 10 digits' }
);

/** Email validation */
export const emailSchema = z
  .string()
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email format',
  });

/** Store hours validation */
export const storeHoursSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return false;
    const hasDays = /[A-Za-z]{3}/.test(val);
    const hasTimes = /\d{1,2}(?::\d{2})?[AP]M/i.test(val);
    return hasDays && hasTimes;
  },
  { message: 'Include day names and times (e.g., Mon–Sat: 10AM–8PM)' }
);

/** Plus code validation (optional) */
export const plusCodeSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return true;
    return /^[A-Z0-9]{2,4}\+[A-Z0-9]{2,3}$/i.test(val.trim());
  },
  { message: 'Invalid Plus Code format (e.g., 849VCWC8+R9)' }
);

/** Company email validation (conditional) */
export const companyEmailSchema = z
  .string()
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email format',
  });

export const citizenEmailSchema = z
  .string()
  .refine((val) => /^[^\s@]+@citizenwatchgroup\.com$/.test(val), {
    message: 'Company email must be @citizenwatchgroup.com',
  });

/**
 * Full profile form schema for React Hook Form + Zod validation.
 * Company email is validated conditionally based on job title.
 *
 * Note: Optional fields use z.string() (not .optional()) so React Hook Form
 * always sees string values, avoiding string | undefined type mismatches.
 */
export const profileFormSchema = z
  .object({
    employeeName: z.string().min(1, 'Your name is required'),
    jobTitle: z.string().min(1, 'Job title is required'),
    companyEmail: z.string(),
    storeName: z.string().min(1, 'Store name is required'),
    storeLocation: z.string().min(1, 'Store location is required'),
    storeAddress: z.string(),
    storePlusCode: plusCodeSchema,
    storePhone: phoneSchema,
    storeEmail: emailSchema,
    storeHours: storeHoursSchema,
    storeDirections: z.string(),
  })
  .refine(
    (data) => {
      if (!requiresCompanyEmail(data.jobTitle)) return true;
      if (!data.companyEmail || data.companyEmail.trim() === '') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.companyEmail);
    },
    {
      message: 'Company email is required for management positions',
      path: ['companyEmail'],
    }
  )
  .refine(
    (data) => {
      if (!requiresCompanyEmail(data.jobTitle)) return true;
      if (!data.companyEmail) return false;
      return /^[^\s@]+@citizenwatchgroup\.com$/.test(data.companyEmail);
    },
    {
      message: 'Company email must be @citizenwatchgroup.com',
      path: ['companyEmail'],
    }
  );

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * Default store hours value.
 */
export const DEFAULT_STORE_HOURS = 'Mon–Sat: 10AM–8PM | Sun: 10AM–7PM';
