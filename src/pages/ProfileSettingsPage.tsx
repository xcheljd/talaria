/**
 * ProfileSettingsPage — React migration of start.html
 *
 * Composition shell for the settings screen:
 * - Sidebar nav switching between Profile / Keywords / Preferences
 * - Owns the React Hook Form + Zod form shared by the Profile and Keywords
 *   sections (both save together through the one Save button)
 * - Delegates the section bodies to src/components/profile/*
 * - Export / Import profile buttons with shadcn Dialog
 * - Validation summary using shadcn Alert
 */

import { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Save,
  Upload,
  Download,
  AlertCircle,
  Info,
  User,
  Tags,
  SlidersHorizontal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useTauri } from '@/hooks/useTauri';
import {
  profileFormSchema,
  type ProfileFormValues,
  requiresCompanyEmail,
  validatePhone,
  DEFAULT_STORE_HOURS,
} from '@/lib/profile-validation';
import type { UserProfile } from '@/lib/profile';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';
import { ProfileFormSection } from '@/components/profile/ProfileFormSection';
import { BrandSettingsSection } from '@/components/profile/BrandSettingsSection';
import { PreferencesSection } from '@/components/profile/PreferencesSection';
import { ProfileImportDialog } from '@/components/profile/ProfileImportDialog';
import {
  toKeywordList,
  exportProfileJson,
} from '@/components/profile/profile-form-utils';

// ─── Sidebar sections ─────────────────────────────────────────────────────────

type SettingsSection = 'profile' | 'keywords' | 'preferences';

const SECTIONS: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'keywords', label: 'Keywords', icon: Tags },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, saveProfile } = useProfile();
  const { lightPalette, darkPalette } = useTheme();
  const { isTauri, invoke, openFolderDialog } = useTauri();

  // Seeded from the Rust config on mount (see effect below), not from
  // localStorage — `downloads-config.json` is the single source of truth for
  // where `save_file_to_dir` actually writes.
  const [downloadFolder, setDownloadFolder] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [section, setSection] = useState<SettingsSection>('profile');

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

  // The field array stays here rather than inside BrandLinksEditor: switching
  // sidebar sections unmounts that editor, and the rows have to survive it.
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
    await exportProfileJson(form.getValues(), lightPalette, darkPalette);
  }, [form, lightPalette, darkPalette]);

  // ─── Download Folder Handler ──────────────────────────────────────────────

  // Show the folder downloads ACTUALLY go to. Previously this screen rendered a
  // separate localStorage copy, which is written alongside the Rust config but
  // read independently — so losing either one (clearing webview data, changing
  // the Tauri identifier, restoring a backup) left the UI displaying a folder
  // that files were no longer being written to, with no way to notice.
  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    invoke<string>('get_download_dir')
      .then((dir) => {
        if (!cancelled) setDownloadFolder(dir ?? '');
      })
      .catch(() => {
        // Leave blank; the field falls back to its "system Downloads" hint.
      });
    return () => {
      cancelled = true;
    };
  }, [isTauri, invoke]);

  const handleChooseFolder = useCallback(async () => {
    // choose_download_dir persists the selection to downloads-config.json and
    // returns it, so the state below and the write target stay in agreement.
    const folder = await openFolderDialog();
    if (folder) {
      setDownloadFolder(folder);
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
          <p className="mb-4 text-sm text-muted-foreground">Talaria</p>
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
          {/* Profile Required Banner. `text-warning` has to sit on the Alert
              itself: alertVariants ships `[&>svg]:text-current`, whose
              descendant selector outranks a utility class on the icon, so the
              icon follows the root's color. */}
          {showProfileBanner && (
            <Alert className="mb-4 border-warning/40 bg-warning/10 text-warning">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-warning">
                <strong>Profile required:</strong> Please complete your profile
                to continue to the Promotion Email Generator.
              </AlertDescription>
            </Alert>
          )}

          {/* Save Success Banner */}
          {saveSuccess && (
            <Alert className="mb-4 border-success/40 bg-success/10 text-success">
              <AlertDescription className="text-success">
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
                      <ProfileFormSection
                        form={form}
                        showCompanyEmail={showCompanyEmail}
                        brandLinkFields={brandLinkFields}
                        appendBrandLink={appendBrandLink}
                        removeBrandLink={removeBrandLink}
                      />
                    )}

                    {/* Keywords fields */}
                    {section === 'keywords' && (
                      <BrandSettingsSection form={form} />
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Preferences section */}
          {section === 'preferences' && (
            <PreferencesSection
              isTauri={isTauri}
              downloadFolder={downloadFolder}
              onChooseFolder={handleChooseFolder}
            />
          )}
        </div>
      </div>

      {/* Import Dialog + hidden file input */}
      <ProfileImportDialog
        form={form}
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}
