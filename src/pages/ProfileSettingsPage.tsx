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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Save,
  Upload,
  Download,
  FolderOpen,
  AlertCircle,
  Info,
} from 'lucide-react';

import { useProfile } from '@/contexts/ProfileProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useTauri } from '@/hooks/useTauri';
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
} from '@/lib/theme-utils';

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

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, saveProfile } = useProfile();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } =
    useTheme();
  const { isTauri, openFolderDialog } = useTauri();

  const [downloadFolder, setDownloadFolder] = useState<string>(
    () => localStorage.getItem('downloadFolderPath') || ''
  );
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Form Setup ───────────────────────────────────────────────────────────

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      employeeName: profile?.employeeName || '',
      jobTitle: profile?.jobTitle || '',
      companyEmail: profile?.companyEmail || '',
      storeName: profile?.storeName || '',
      storeLocation: profile?.storeLocation || '',
      storeAddress: profile?.storeAddress || '',
      storePlusCode: profile?.storePlusCode || '',
      storePhone: profile?.storePhone || '',
      storeEmail: profile?.storeEmail || '',
      storeHours: profile?.storeHours || DEFAULT_STORE_HOURS,
      storeDirections: profile?.storeDirections || '',
    },
  });

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
            decodedUrl === '/start'
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

  const handleExport = useCallback(() => {
    const values = form.getValues();
    const profileData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile: {
        employeeName: values.employeeName?.trim() || '',
        jobTitle: values.jobTitle?.trim() || '',
        companyEmail: values.companyEmail?.trim() || '',
        storeName: values.storeName?.trim() || '',
        storeLocation: values.storeLocation?.trim() || '',
        storePhone: values.storePhone?.trim() || '',
        storeEmail: values.storeEmail?.trim() || '',
        storeAddress: values.storeAddress?.trim() || '',
        storePlusCode: values.storePlusCode?.trim() || '',
        storeHours: values.storeHours?.trim() || '',
        storeDirections: values.storeDirections?.trim() || '',
        lightPalette: lightPalette,
        darkPalette: darkPalette,
        currentMode: localStorage.getItem('theme') || 'light',
      },
    };

    const dataStr = JSON.stringify(profileData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `profile-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            storeName: importedProfile.storeName || '',
            storeLocation: importedProfile.storeLocation || '',
            storePhone: importedProfile.storePhone || '',
            storeEmail: importedProfile.storeEmail || '',
            storeAddress: importedProfile.storeAddress || '',
            storePlusCode: importedProfile.storePlusCode || '',
            storeHours: importedProfile.storeHours || DEFAULT_STORE_HOURS,
            storeDirections: importedProfile.storeDirections || '',
          });

          // Restore theme preferences
          if (importedProfile.lightPalette) {
            setLightPalette(importedProfile.lightPalette);
          }
          if (importedProfile.darkPalette) {
            setDarkPalette(importedProfile.darkPalette);
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

  // ─── Download Folder Handler ──────────────────────────────────────────────

  const handleChooseFolder = useCallback(async () => {
    const folder = await openFolderDialog();
    if (folder) {
      setDownloadFolder(folder);
      localStorage.setItem('downloadFolderPath', folder);
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
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Profile Required Banner */}
      {showProfileBanner && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Profile required:</strong> Please complete your profile to
            continue to the Promotion Email Generator.
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

      {/* Profile Card */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Welcome to Communication Template Generator
          </CardTitle>
          <CardDescription>
            Set up your profile to auto-fill common fields across all templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Info Box */}
          <div className="mb-6 rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm text-muted-foreground">
            This information will be saved locally on your device and used to
            automatically fill in your details when creating templates. You can
            update this information anytime.
          </div>

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

              {/* Form Grid */}
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
                          Company Email{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="mx-auto max-w-[50%]">
                          <FormControl>
                            <ClearableInput
                              type="email"
                              placeholder="your.name@citizenwatchgroup.com"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                        </div>
                        <FormDescription className="text-center">
                          Required for management positions — Used in email
                          signatures for managers and above
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Divider */}
                <Separator className="col-span-1 lg:col-span-2" />

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
                          placeholder="Citizen Company Store - Orlando"
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
                          placeholder="the Orlando Premium Outlets"
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
                          placeholder="CWC8+R9"
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
                          placeholder="store@citizenwatchgroup.com"
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl">Settings</CardTitle>
          <CardDescription>Customize your app preferences</CardDescription>
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
                Used by the desktop app to save EML/EMLTPL and ZIP files. In a
                regular browser, your default Downloads folder is always used.
              </p>
            </div>

            {/* Light Palette Selector */}
            <div>
              <Label className="mb-2 block">Light Mode Color Palette</Label>
              <Select value={lightPalette} onValueChange={setLightPalette}>
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
              <Label className="mb-2 block">Dark Mode Color Palette</Label>
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
