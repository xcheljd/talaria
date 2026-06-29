/**
 * ProfileSettingsPage — React migration of start.html
 *
 * Features:
 * - shadcn Form with React Hook Form + Zod validation
 * - Job Title → shadcn Select that shows/hides Company Email field
 * - Palette selectors (Light/Dark mode) using shadcn Select
 * - Download folder picker with useTauri() hook
 * - Export/Import profile buttons with shadcn Dialog
 * - Validation summary using shadcn Alert
 * - Responsive 2-column layout with shadcn Card
 */

import { useState, useRef, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Save,
  Upload,
  Download,
  FolderOpen,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  User,
  Tags,
  SlidersHorizontal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useTauri } from '@/hooks/useTauri';
import { useDevMode } from '@/hooks/useDevMode';
import { usePreviewThemeSync } from '@/hooks/usePreviewThemeSync';
import {
  profileFormSchema,
  type ProfileFormValues,
  requiresCompanyEmail,
  validatePhone,
  JOB_TITLES,
  DEFAULT_STORE_HOURS,
} from '@/lib/profile-validation';
import type { UserProfile } from '@/lib/profile';
import {
  VALID_LIGHT_PALETTES,
  VALID_DARK_PALETTES,
  LIGHT_PALETTE_LABELS,
  DARK_PALETTE_LABELS,
  validatePalette,
} from '@/lib/theme-utils';
import { saveBlob } from '@/lib/file-save';
import { StorageKeys } from '@/lib/storage-keys';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ClearableInput } from '@/components/ui/clearable-input';
import { ClearableTextarea } from '@/components/ui/clearable-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// ─── Sidebar sections ─────────────────────────────────────────────────────────

type SettingsSection = 'profile' | 'keywords' | 'preferences';

const SECTIONS: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'keywords', label: 'Keywords', icon: Tags },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split a comma-separated keyword string into a trimmed, de-duplicated list. */
function toKeywordList(value: string): string[] {
  return Array.from(
    new Set(
      (value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, saveProfile } = useProfile();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } =
    useTheme();
  const { isTauri, openFolderDialog } = useTauri();
  const { devMode, setDevMode } = useDevMode();
  const { syncPreviewTheme, setSyncPreviewTheme } = usePreviewThemeSync();

  const [downloadFolder, setDownloadFolder] = useState<string>(
    () => localStorage.getItem(StorageKeys.downloadFolderPath) || ''
  );
  const [pdfOptimize, setPdfOptimize] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.pdfOptimize) !== 'false'
  );
  const [stripAccessibility, setStripAccessibility] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.pdfStripAccessibility) !== 'false'
  );
  const [downloadSaveAs, setDownloadSaveAs] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.downloadSaveAs) !== 'false'
  );
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [section, setSection] = useState<SettingsSection>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Form Setup ───────────────────────────────────────────────────────────

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      employeeName: profile?.employeeName || '',
      jobTitle: profile?.jobTitle || '',
      companyEmail: profile?.companyEmail || '',
      companyName: profile?.companyName || '',
      storeName: profile?.storeName || '',
      storeLocation: profile?.storeLocation || '',
      storeAddress: profile?.storeAddress || '',
      storePlusCode: profile?.storePlusCode || '',
      storePhone: profile?.storePhone || '',
      storeEmail: profile?.storeEmail || '',
      storeHours: profile?.storeHours || DEFAULT_STORE_HOURS,
      storeDirections: profile?.storeDirections || '',
      productNoun: profile?.productNoun || '',
      productNounPlural: profile?.productNounPlural || '',
      brandLinks: profile?.brandLinks ?? [],
      brandKeywords: (profile?.brandKeywords ?? []).join(', '),
      collectionKeywords: (profile?.collectionKeywords ?? []).join(', '),
    },
  });

  const {
    fields: brandLinkFields,
    append: appendBrandLink,
    remove: removeBrandLink,
  } = useFieldArray({ control: form.control, name: 'brandLinks' });

  const jobTitle = form.watch('jobTitle');
  const showCompanyEmail = requiresCompanyEmail(jobTitle);

  // ─── Save Handler ─────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    (data: ProfileFormValues) => {
      // Format phone before saving
      const phoneValidation = validatePhone(data.storePhone);
      const profileData: UserProfile = {
        ...data,
        storePhone: phoneValidation.isValid
          ? phoneValidation.formatted
          : data.storePhone,
        // Drop blank brand-link rows and trim the rest
        brandLinks: data.brandLinks
          .map((link) => ({ name: link.name.trim(), url: link.url.trim() }))
          .filter((link) => link.name && link.url),
        // Comma-separated keyword strings → arrays
        brandKeywords: toKeywordList(data.brandKeywords),
        collectionKeywords: toKeywordList(data.collectionKeywords),
      };

      saveProfile(profileData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Navigate back if redirected from another page
      const returnUrl = searchParams.get('return');
      if (returnUrl) {
        setTimeout(() => {
          const decodedUrl = decodeURIComponent(returnUrl);
          // Only navigate to known internal routes
          if (
            decodedUrl === '/' ||
            decodedUrl === '/promotion' ||
            decodedUrl === '/settings'
          ) {
            navigate(decodedUrl);
          } else {
            navigate('/');
          }
        }, 1000);
      }
    },
    [saveProfile, searchParams, navigate]
  );

  // ─── Export Handler ───────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    const values = form.getValues();
    const profileData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile: {
        employeeName: values.employeeName?.trim() || '',
        jobTitle: values.jobTitle?.trim() || '',
        companyEmail: values.companyEmail?.trim() || '',
        companyName: values.companyName?.trim() || '',
        storeName: values.storeName?.trim() || '',
        storeLocation: values.storeLocation?.trim() || '',
        storePhone: values.storePhone?.trim() || '',
        storeEmail: values.storeEmail?.trim() || '',
        storeAddress: values.storeAddress?.trim() || '',
        storePlusCode: values.storePlusCode?.trim() || '',
        storeHours: values.storeHours?.trim() || '',
        storeDirections: values.storeDirections?.trim() || '',
        productNoun: values.productNoun?.trim() || '',
        productNounPlural: values.productNounPlural?.trim() || '',
        brandLinks: (values.brandLinks ?? [])
          .map((link) => ({ name: link.name.trim(), url: link.url.trim() }))
          .filter((link) => link.name && link.url),
        brandKeywords: toKeywordList(values.brandKeywords),
        collectionKeywords: toKeywordList(values.collectionKeywords),
        lightPalette: lightPalette,
        darkPalette: darkPalette,
        currentMode: localStorage.getItem(StorageKeys.theme) || 'light',
      },
    };

    const dataStr = JSON.stringify(profileData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    await saveBlob(
      dataBlob,
      `profile-backup-${new Date().toISOString().split('T')[0]}.json`
    );
  }, [form, lightPalette, darkPalette]);

  // ─── Import Handler ───────────────────────────────────────────────────────

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setImportError('Please select a JSON file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);

          if (!importedData.profile) {
            throw new Error('Invalid profile file format');
          }

          const importedProfile = importedData.profile;

          form.reset({
            employeeName: importedProfile.employeeName || '',
            jobTitle: importedProfile.jobTitle || '',
            companyEmail: importedProfile.companyEmail || '',
            companyName: importedProfile.companyName || '',
            storeName: importedProfile.storeName || '',
            storeLocation: importedProfile.storeLocation || '',
            storePhone: importedProfile.storePhone || '',
            storeEmail: importedProfile.storeEmail || '',
            storeAddress: importedProfile.storeAddress || '',
            storePlusCode: importedProfile.storePlusCode || '',
            storeHours: importedProfile.storeHours || DEFAULT_STORE_HOURS,
            storeDirections: importedProfile.storeDirections || '',
            productNoun: importedProfile.productNoun || '',
            productNounPlural: importedProfile.productNounPlural || '',
            brandLinks: Array.isArray(importedProfile.brandLinks)
              ? importedProfile.brandLinks
                  .filter(
                    (link: unknown): link is { name?: string; url?: string } =>
                      !!link && typeof link === 'object'
                  )
                  .map((link: { name?: string; url?: string }) => ({
                    name: String(link.name ?? ''),
                    url: String(link.url ?? ''),
                  }))
              : [],
            brandKeywords: Array.isArray(importedProfile.brandKeywords)
              ? importedProfile.brandKeywords.map(String).join(', ')
              : '',
            collectionKeywords: Array.isArray(
              importedProfile.collectionKeywords
            )
              ? importedProfile.collectionKeywords.map(String).join(', ')
              : '',
          });

          // Restore theme preferences (validated — imported files can carry
          // arbitrary strings)
          if (importedProfile.lightPalette) {
            setLightPalette(
              validatePalette(importedProfile.lightPalette, 'light')
            );
          }
          if (importedProfile.darkPalette) {
            setDarkPalette(
              validatePalette(importedProfile.darkPalette, 'dark')
            );
          }

          setShowImportDialog(false);
          setImportError(null);
        } catch (error) {
          setImportError(
            error instanceof Error ? error.message : 'Failed to import profile'
          );
        }
      };
      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [form, setLightPalette, setDarkPalette]
  );

  // ─── PDF Settings Handlers ────────────────────────────────────────────────

  const handlePdfOptimizeChange = useCallback((checked: boolean) => {
    setPdfOptimize(checked);
    localStorage.setItem(StorageKeys.pdfOptimize, String(checked));
  }, []);

  const handleStripAccessibilityChange = useCallback((checked: boolean) => {
    setStripAccessibility(checked);
    localStorage.setItem(StorageKeys.pdfStripAccessibility, String(checked));
  }, []);

  const handleDownloadSaveAsChange = useCallback((checked: boolean) => {
    setDownloadSaveAs(checked);
    localStorage.setItem(StorageKeys.downloadSaveAs, String(checked));
  }, []);

  const handleDevModeChange = useCallback(
    (checked: boolean) => {
      setDevMode(checked);
    },
    [setDevMode]
  );

  // ─── Download Folder Handler ──────────────────────────────────────────────

  const handleChooseFolder = useCallback(async () => {
    const folder = await openFolderDialog();
    if (folder) {
      setDownloadFolder(folder);
      localStorage.setItem(StorageKeys.downloadFolderPath, folder);
    }
  }, [openFolderDialog]);

  // ─── Profile Required Banner ──────────────────────────────────────────────

  const showProfileBanner =
    searchParams.has('return') ||
    (location.state as { from?: string })?.from === '/promotion';

  // ─── Validation Summary ───────────────────────────────────────────────────

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-56 lg:shrink-0">
          <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
          <p className="mb-4 text-sm text-muted-foreground">CometCast</p>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    section === s.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Profile Required Banner */}
          {showProfileBanner && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Profile required:</strong> Please complete your profile
                to continue to the Promotion Email Generator.
              </AlertDescription>
            </Alert>
          )}

          {/* Save Success Banner */}
          {saveSuccess && (
            <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950/20">
              <AlertDescription className="text-green-800 dark:text-green-200">
                Profile saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Profile & Keywords (form-backed sections) */}
          {(section === 'profile' || section === 'keywords') && (
            <Card>
              <CardContent className="pt-6">
                {section === 'profile' && (
                  <div className="mb-6 rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm text-muted-foreground">
                    Saved locally on your device and used to auto-fill your
                    details across templates. Update anytime.
                  </div>
                )}

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(
                      () => {
                        setAttemptedSubmit(false);
                        onSubmit(form.getValues() as ProfileFormValues);
                      },
                      () => {
                        setAttemptedSubmit(true);
                      }
                    )}
                  >
                    {/* Action Buttons (top) */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Button type="submit" size="sm">
                        <Save className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImportDialog(true)}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Import
                      </Button>
                    </div>

                    {/* Validation Summary */}
                    {attemptedSubmit &&
                      Object.keys(form.formState.errors).length > 0 && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Please complete all required fields:{' '}
                            {Object.entries(form.formState.errors)
                              .filter(([, error]) => error?.message)
                              .map(([field, error]) => error.message || field)
                              .join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                    {/* Profile fields */}
                    {section === 'profile' && (
                      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
                        {/* Employee Name */}
                        <FormField
                          control={form.control}
                          name="employeeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Your Name{' '}
                                <span className="text-destructive">*</span>
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
                                Job Title{' '}
                                <span className="text-destructive">*</span>
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
                                  Company Email{' '}
                                  <span className="text-destructive">*</span>
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
                                  Required for management positions — Used in
                                  email signatures for managers and above
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Divider */}
                        <Separator className="col-span-1 lg:col-span-2" />

                        {/* Brand Identity header */}
                        <div className="col-span-1 lg:col-span-2">
                          <h3 className="text-sm font-semibold">
                            Brand Identity
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Your company name, what you sell, and the website
                            links shown in your email signature. These make
                            every template yours.
                          </p>
                        </div>

                        {/* Company Name */}
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Company Name{' '}
                                <span className="text-destructive">*</span>
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
                                Shown in email signatures and as the sender name
                                in previews
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
                                Store Name{' '}
                                <span className="text-destructive">*</span>
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
                                Store Location{' '}
                                <span className="text-destructive">*</span>
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
                                Format: "the [Mall Name]" — Used in email
                                signatures
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
                                Store Phone{' '}
                                <span className="text-destructive">*</span>
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
                                Store Email{' '}
                                <span className="text-destructive">*</span>
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
                                Store Hours{' '}
                                <span className="text-destructive">*</span>
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
                              <FormLabel>
                                Store Directions / Location Notes (optional)
                              </FormLabel>
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
                              <FormDescription>
                                Used in promotion email template
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Divider */}
                        <Separator className="col-span-1 lg:col-span-2" />

                        {/* What you sell header */}
                        <div className="col-span-1 lg:col-span-2">
                          <h3 className="text-sm font-semibold">
                            What You Sell
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            The word for your product is woven into email copy
                            and subject lines (e.g. "Your New Watch Awaits").
                            Leave blank to use the neutral default ("product").
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
                              <FormDescription>
                                e.g. watch, candle, bag
                              </FormDescription>
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
                              <FormDescription>
                                e.g. watches, candles, bags
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Brand Links editor */}
                        <div className="col-span-1 space-y-2 lg:col-span-2">
                          <div>
                            <FormLabel>
                              Signature Brand Links (optional)
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Website links shown in your email signature
                              footer. Add one per brand or site you want to
                              link.
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
                            onClick={() =>
                              appendBrandLink({ name: '', url: '' })
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add brand link
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Keywords fields */}
                    {section === 'keywords' && (
                      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
                        {/* Subject line keywords header */}
                        <div className="col-span-1 lg:col-span-2">
                          <h3 className="text-sm font-semibold">
                            Subject Line Keywords
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Brand and collection names the subject-line
                            generator can feature in suggestions (e.g. "Spring
                            Aria Sale"). Separate multiple values with commas.
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
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Preferences section */}
          {section === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Preferences</CardTitle>
                <CardDescription>
                  Customize your app preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:p-6 lg:grid-cols-2">
                  {/* Download Folder */}
                  <div className="col-span-1 lg:col-span-2">
                    <Label className="mb-2 block">
                      Download Folder (Desktop app)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={
                          isTauri
                            ? downloadFolder || 'Using system Downloads folder'
                            : 'Browser: uses system Downloads folder'
                        }
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleChooseFolder}
                        disabled={!isTauri}
                      >
                        <FolderOpen className="mr-1 h-4 w-4" />
                        {isTauri ? 'Choose Folder' : 'Desktop app only'}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used by the desktop app to save downloaded files (email
                      batches, drafts, exports). In a regular browser, your
                      default Downloads folder is always used.
                    </p>
                  </div>

                  {/* Download Behavior */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="download-save-as"
                        checked={downloadSaveAs}
                        onCheckedChange={handleDownloadSaveAsChange}
                      />
                      <Label htmlFor="download-save-as">
                        Ask where to save each download
                      </Label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When enabled, a Save As dialog appears for every download
                      (drafts, HTML, exports, batch files). When disabled, files
                      save silently to your configured download folder. Only
                      applies in the desktop app.
                    </p>
                  </div>

                  {/* PDF Optimization */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="pdf-optimize"
                        checked={pdfOptimize}
                        onCheckedChange={handlePdfOptimizeChange}
                      />
                      <Label htmlFor="pdf-optimize">
                        Optimize attached PDFs
                      </Label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Downsamples over-resolution embedded images to reduce file
                      size when attaching PDFs. Disable to attach PDFs exactly
                      as-is.
                    </p>
                  </div>

                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="strip-accessibility"
                        checked={stripAccessibility}
                        onCheckedChange={handleStripAccessibilityChange}
                      />
                      <Label htmlFor="strip-accessibility">
                        Strip accessibility metadata from attached PDFs
                      </Label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Removes screen-reader metadata (StructTreeRoot) for ~18%
                      additional size reduction. Suitable for visual-only
                      documents such as promotion flyers. Disable if your PDFs
                      contain substantial text for screen-reader users.
                    </p>
                  </div>

                  {/* Dev Mode */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="dev-mode"
                        checked={devMode}
                        onCheckedChange={handleDevModeChange}
                        data-testid="dev-mode-switch"
                      />
                      <Label htmlFor="dev-mode">Dev mode</Label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reveals advanced surfaces still under construction: the
                      Templates page, the promotion HTML Code tab, and the Email
                      Theme, Accessibility Check, and Outlook Compatibility
                      cards. Persists across sessions.
                    </p>
                  </div>

                  {/* Sync email preview with app theme */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="sync-preview-theme"
                        checked={syncPreviewTheme}
                        onCheckedChange={setSyncPreviewTheme}
                        data-testid="sync-preview-theme-switch"
                      />
                      <Label htmlFor="sync-preview-theme">
                        Sync email preview with app theme
                      </Label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When on, the live email preview follows the app's
                      light/dark mode — switching one switches the other. Turn
                      off to keep the preview's own light/dark toggle
                      independent of the app theme.
                    </p>
                  </div>

                  {/* Light Palette Selector */}
                  <div>
                    <Label className="mb-2 block">
                      Light Mode Color Palette
                    </Label>
                    <Select
                      value={lightPalette}
                      onValueChange={setLightPalette}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_LIGHT_PALETTES.map((palette) => (
                          <SelectItem key={palette} value={palette}>
                            {LIGHT_PALETTE_LABELS[palette] || palette}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose your preferred color scheme for light mode
                    </p>
                  </div>

                  {/* Dark Palette Selector */}
                  <div>
                    <Label className="mb-2 block">
                      Dark Mode Color Palette
                    </Label>
                    <Select value={darkPalette} onValueChange={setDarkPalette}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_DARK_PALETTES.map((palette) => (
                          <SelectItem key={palette} value={palette}>
                            {DARK_PALETTE_LABELS[palette] || palette}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose your preferred color scheme for dark mode
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Profile</DialogTitle>
            <DialogDescription>
              Select a JSON file to import your profile data. This will replace
              all current form values.
            </DialogDescription>
          </DialogHeader>
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />
              Choose File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
        data-testid="import-file-input"
      />
    </div>
  );
}
