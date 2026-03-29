/**
 * Start App — ES module entry point for start.html
 *
 * Extracted from inline <script> blocks. Imports shared utilities for theme,
 * page transitions, profile management, and toast notifications. All page-
 * specific logic (form validation, profile lifecycle, export/import, Tauri
 * integration) lives here.
 *
 * Zero behavior change — pure refactor.
 */

import {
  initTheme,
  toggleTheme,
  updateThemeIndicator,
  setLightPalette,
  setDarkPalette,
} from './shared/theme.js';
import { initPageTransitions } from './shared/pageTransitions.js';
import { saveUserProfile, getUserProfile } from './shared/profile.js';
import { showToast } from './shared/ui-utils.js';

// ---------------------------------------------------------------------------
// Exported validation helpers (unit-tested in tests/start-app.test.js)
// ---------------------------------------------------------------------------

/**
 * Check if a job title requires a company email address.
 * @param {string} jobTitle
 * @returns {boolean}
 */
export function requiresCompanyEmail(jobTitle) {
  const managementTitles = [
    'Assistant Store Manager',
    'Associate Store Manager',
    'General Manager',
    'Area Manager',
    'Regional Manager',
    'District Manager',
  ];
  return managementTitles.includes(jobTitle);
}

/**
 * Validate and format a phone number.
 * @param {string} phone
 * @returns {{ isValid: boolean, formatted: string, error: string|null }}
 */
export function validatePhone(phone) {
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
 * @param {string} digits
 * @returns {string}
 */
export function formatPhone(digits) {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Validate an email address.
 * @param {string} email
 * @returns {{ isValid: boolean, isCitizenEmail: boolean, error: string|null }}
 */
export function validateEmail(email) {
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
 * @param {string} hours
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateStoreHours(hours) {
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
 * @param {string} plusCode
 * @returns {{ isValid: boolean, formatted?: string, error: string|null }}
 */
export function validatePlusCode(plusCode) {
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
 * @param {string} email
 * @param {string} jobTitle
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateCompanyEmail(email, jobTitle) {
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

// ---------------------------------------------------------------------------
// Palette select sync (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Sync the #lightPaletteSelect and #darkPaletteSelect dropdown values with
 * the current localStorage palette preferences. initTheme() sets the
 * data-*-palette attributes on <html> but does NOT update the <select>
 * elements — this function bridges that gap.
 */
export function syncPaletteSelects() {
  const lightPaletteSelect = document.getElementById('lightPaletteSelect');
  if (lightPaletteSelect) {
    lightPaletteSelect.value = localStorage.getItem('lightPalette') || 'github';
  }
  const darkPaletteSelect = document.getElementById('darkPaletteSelect');
  if (darkPaletteSelect) {
    darkPaletteSelect.value = localStorage.getItem('darkPalette') || 'github';
  }
}

// ---------------------------------------------------------------------------
// DOM helpers (not exported — page-specific)
// ---------------------------------------------------------------------------

/**
 * Map from error element IDs to their corresponding input element IDs.
 * The suffix-stripping approach (e.g. 'phoneError' -> 'phone') does not work
 * because the actual input IDs are prefixed (e.g. 'storePhone', not 'phone').
 */
const errorToInputMap = {
  phoneError: 'storePhone',
  emailError: 'storeEmail',
  hoursError: 'storeHours',
  plusCodeError: 'storePlusCode',
  companyEmailError: 'companyEmail',
};

function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId);
  const inputId = errorToInputMap[fieldId];
  const inputElement = inputId
    ? document.getElementById(inputId)
    : document.getElementById(fieldId.replace('Error', ''));

  if (errorElement && inputElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    inputElement.classList.add('input-error');
  }
}

function hideError(fieldId) {
  const errorElement = document.getElementById(fieldId);
  const inputId = errorToInputMap[fieldId];
  const inputElement = inputId
    ? document.getElementById(inputId)
    : document.getElementById(fieldId.replace('Error', ''));

  if (errorElement && inputElement) {
    errorElement.style.display = 'none';
    inputElement.classList.remove('input-error');
  }
}

function showValidationSummary(missingFields) {
  const summary = document.getElementById('validationSummary');
  const text = document.getElementById('validationSummaryText');
  if (summary && text) {
    text.textContent = 'Please complete: ' + missingFields.join(', ');
    summary.style.display = 'flex';
  }
}

function hideValidationSummary() {
  const summary = document.getElementById('validationSummary');
  if (summary) {
    summary.style.display = 'none';
  }
}

// ---------------------------------------------------------------------------
// Company email field toggle
// ---------------------------------------------------------------------------

function toggleCompanyEmailField(
  jobTitleInput,
  companyEmailInput,
  companyEmailGroup
) {
  const jobTitle = jobTitleInput.value;
  const requiresEmail = requiresCompanyEmail(jobTitle);

  if (requiresEmail) {
    companyEmailGroup.style.display = 'block';
    companyEmailInput.required = true;
  } else {
    companyEmailGroup.style.display = 'none';
    companyEmailInput.required = false;
    companyEmailInput.value = '';
    hideError('companyEmailError');
  }
}

// ---------------------------------------------------------------------------
// Export / Import profile
// ---------------------------------------------------------------------------

function exportProfile(
  jobTitleInput,
  companyEmailInput,
  storeNameInput,
  storeLocationInput,
  storePhoneInput,
  storeEmailInput,
  storeAddressInput,
  storePlusCodeInput,
  storeHoursInput,
  storeDirectionsInput
) {
  const exportBtn = document.getElementById('exportProfileBtn');

  exportBtn.classList.add('loading');
  exportBtn.disabled = true;

  setTimeout(() => {
    const profileData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile: {
        employeeName: document.getElementById('employeeName').value.trim(),
        jobTitle: jobTitleInput.value.trim(),
        companyEmail: companyEmailInput.value.trim(),
        storeName: storeNameInput.value.trim(),
        storeLocation: storeLocationInput.value.trim(),
        storePhone: storePhoneInput.value.trim(),
        storeEmail: storeEmailInput.value.trim(),
        storeAddress: storeAddressInput.value.trim(),
        storePlusCode: storePlusCodeInput.value.trim(),
        storeHours: storeHoursInput.value.trim(),
        storeDirections: storeDirectionsInput.value.trim(),
        // Theme preferences
        lightPalette: localStorage.getItem('lightPalette') || 'pastel',
        darkPalette: localStorage.getItem('darkPalette') || 'midnight-blue',
        currentMode: localStorage.getItem('theme') || 'light',
      },
    };

    const requiredFields = [
      'employeeName',
      'jobTitle',
      'storeName',
      'storeLocation',
      'storePhone',
      'storeEmail',
      'storeHours',
    ];
    const missingFields = requiredFields.filter(
      (field) => !profileData.profile[field]
    );

    if (missingFields.length > 0) {
      exportBtn.classList.remove('loading');
      exportBtn.disabled = false;
      showToast('Please fill in all required fields before exporting');
      return;
    }

    try {
      const dataStr = JSON.stringify(profileData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `citizen-profile-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      exportBtn.classList.remove('loading');
      exportBtn.classList.add('success');
      showToast('✓ Profile exported successfully');

      setTimeout(() => {
        exportBtn.classList.remove('success');
        exportBtn.disabled = false;
      }, 1000);
    } catch (e) {
      console.error('Error exporting profile:', e);
      exportBtn.classList.remove('loading');
      exportBtn.disabled = false;
      showToast('Error exporting profile. Please try again.');
    }
  }, 300);
}

function importProfile(
  file,
  jobTitleInput,
  companyEmailInput,
  storeNameInput,
  storeLocationInput,
  storePhoneInput,
  storeEmailInput,
  storeAddressInput,
  storePlusCodeInput,
  storeHoursInput,
  storeDirectionsInput,
  companyEmailGroup
) {
  return new Promise((resolve, reject) => {
    const importBtn = document.getElementById('importProfileBtn');

    importBtn.classList.add('loading');
    importBtn.disabled = true;

    const reader = new FileReader();

    reader.onload = (e) => {
      setTimeout(() => {
        try {
          const content = e.target.result;
          const importedData = JSON.parse(content);

          if (!importedData.profile) {
            throw new Error('Invalid profile file format');
          }

          const profile = importedData.profile;

          const requiredFields = [
            'employeeName',
            'jobTitle',
            'storeName',
            'storeLocation',
            'storePhone',
            'storeEmail',
            'storeHours',
          ];
          const missingFields = requiredFields.filter(
            (field) => !profile[field]
          );

          if (missingFields.length > 0) {
            throw new Error(
              `Missing required fields: ${missingFields.join(', ')}`
            );
          }

          const phoneValidation = validatePhone(profile.storePhone);
          if (!phoneValidation.isValid) {
            throw new Error('Invalid phone number format');
          }

          const emailValidation = validateEmail(profile.storeEmail);
          if (!emailValidation.isValid) {
            throw new Error('Invalid email format');
          }

          const hoursValidation = validateStoreHours(profile.storeHours);
          if (!hoursValidation.isValid) {
            throw new Error('Invalid store hours format');
          }

          // Fill form fields
          document.getElementById('employeeName').value =
            profile.employeeName || '';
          jobTitleInput.value = profile.jobTitle || '';
          companyEmailInput.value = profile.companyEmail || '';
          storeNameInput.value = profile.storeName || '';
          storeLocationInput.value = profile.storeLocation || '';
          storePhoneInput.value = phoneValidation.formatted;
          storeEmailInput.value = profile.storeEmail || '';
          storeAddressInput.value = profile.storeAddress || '';
          storePlusCodeInput.value = profile.storePlusCode || '';
          storeHoursInput.value = profile.storeHours || '';
          storeDirectionsInput.value = profile.storeDirections || '';

          toggleCompanyEmailField(
            jobTitleInput,
            companyEmailInput,
            companyEmailGroup
          );

          // Restore theme preferences
          if (profile.lightPalette) {
            localStorage.setItem('lightPalette', profile.lightPalette);
            document.getElementById('lightPaletteSelect').value =
              profile.lightPalette;
            setLightPalette(profile.lightPalette);
          }
          if (profile.darkPalette) {
            localStorage.setItem('darkPalette', profile.darkPalette);
            document.getElementById('darkPaletteSelect').value =
              profile.darkPalette;
            setDarkPalette(profile.darkPalette);
          }
          if (profile.currentMode) {
            localStorage.setItem('theme', profile.currentMode);
            document.documentElement.setAttribute(
              'data-theme',
              profile.currentMode
            );
            updateThemeIndicator(profile.currentMode);
          }

          importBtn.classList.remove('loading');
          importBtn.classList.add('success');
          showToast('✓ Profile imported successfully');

          setTimeout(() => {
            importBtn.classList.remove('success');
            importBtn.disabled = false;
          }, 1000);

          resolve();
        } catch (error) {
          console.error('Error importing profile:', error);
          importBtn.classList.remove('loading');
          importBtn.disabled = false;
          showToast(`Import failed: ${error.message}`);
          reject(error);
        }
      }, 500);
    };

    reader.onerror = () => {
      const error = new Error('Failed to read file');
      console.error('File read error:', error);
      importBtn.classList.remove('loading');
      importBtn.disabled = false;
      showToast('Error reading file. Please try again.');
      reject(error);
    };

    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------
// Main initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // ---- Theme setup ----
  initTheme();
  syncPaletteSelects();

  document
    .getElementById('themeToggle')
    ?.addEventListener('click', toggleTheme);

  document
    .getElementById('lightPaletteSelect')
    ?.addEventListener('change', (e) => {
      setLightPalette(e.target.value);
    });

  document
    .getElementById('darkPaletteSelect')
    ?.addEventListener('change', (e) => {
      setDarkPalette(e.target.value);
    });

  // ---- Form element references ----
  const form = document.getElementById('setupForm');
  const jobTitleInput = document.getElementById('jobTitle');
  const companyEmailInput = document.getElementById('companyEmail');
  const companyEmailGroup = document.getElementById('companyEmailGroup');
  const storePhoneInput = document.getElementById('storePhone');
  const storeNameInput = document.getElementById('storeName');
  const storeLocationInput = document.getElementById('storeLocation');
  const storeEmailInput = document.getElementById('storeEmail');
  const storeAddressInput = document.getElementById('storeAddress');
  const storePlusCodeInput = document.getElementById('storePlusCode');
  const storeHoursInput = document.getElementById('storeHours');
  const storeDirectionsInput = document.getElementById('storeDirections');

  // ---- Profile required banner ----
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('return');
  if (returnUrl) {
    const banner = document.getElementById('profileRequiredBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  // ---- Load existing profile data ----
  const userData = getUserProfile();
  if (userData) {
    try {
      if (userData.employeeName)
        document.getElementById('employeeName').value = userData.employeeName;
      if (userData.jobTitle) jobTitleInput.value = userData.jobTitle;
      if (userData.companyEmail)
        companyEmailInput.value = userData.companyEmail;
      if (userData.storeName) storeNameInput.value = userData.storeName;
      if (userData.storeLocation)
        storeLocationInput.value = userData.storeLocation;
      if (userData.storePhone) storePhoneInput.value = userData.storePhone;
      if (userData.storeEmail) storeEmailInput.value = userData.storeEmail;
      if (userData.storeAddress)
        storeAddressInput.value = userData.storeAddress;
      if (userData.storePlusCode)
        storePlusCodeInput.value = userData.storePlusCode;
      if (userData.storeHours) storeHoursInput.value = userData.storeHours;
      if (userData.storeDirections)
        storeDirectionsInput.value = userData.storeDirections;

      toggleCompanyEmailField(
        jobTitleInput,
        companyEmailInput,
        companyEmailGroup
      );
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }

  // ---- Job title change handler ----
  jobTitleInput.addEventListener('change', () => {
    toggleCompanyEmailField(
      jobTitleInput,
      companyEmailInput,
      companyEmailGroup
    );
  });

  // ---- Real-time validation ----
  storePhoneInput.addEventListener('blur', function () {
    const validation = validatePhone(this.value);
    if (validation.isValid) {
      this.value = validation.formatted;
      hideError('phoneError');
    } else {
      showError('phoneError', validation.error);
    }
  });

  storeEmailInput.addEventListener('blur', function () {
    const validation = validateEmail(this.value);
    if (validation.isValid) {
      hideError('emailError');
    } else {
      showError('emailError', validation.error);
    }
  });

  storeHoursInput.addEventListener('blur', function () {
    const validation = validateStoreHours(this.value);
    if (validation.isValid) {
      hideError('hoursError');
    } else {
      showError('hoursError', validation.error);
    }
  });

  storePlusCodeInput.addEventListener('blur', function () {
    const validation = validatePlusCode(this.value);
    if (validation.isValid) {
      this.value = validation.formatted || this.value;
      hideError('plusCodeError');
    } else {
      showError('plusCodeError', validation.error);
    }
  });

  companyEmailInput.addEventListener('blur', function () {
    const validation = validateCompanyEmail(this.value, jobTitleInput.value);
    if (validation.isValid) {
      hideError('companyEmailError');
    } else {
      showError('companyEmailError', validation.error);
    }
  });

  // ---- Export / Import event listeners ----
  document.getElementById('exportProfileBtn').addEventListener('click', () => {
    exportProfile(
      jobTitleInput,
      companyEmailInput,
      storeNameInput,
      storeLocationInput,
      storePhoneInput,
      storeEmailInput,
      storeAddressInput,
      storePlusCodeInput,
      storeHoursInput,
      storeDirectionsInput
    );
  });

  document.getElementById('importProfileBtn').addEventListener('click', () => {
    document.getElementById('importProfileFile').click();
  });

  document
    .getElementById('importProfileFile')
    .addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
          showToast('Please select a JSON file');
          return;
        }

        importProfile(
          file,
          jobTitleInput,
          companyEmailInput,
          storeNameInput,
          storeLocationInput,
          storePhoneInput,
          storeEmailInput,
          storeAddressInput,
          storePlusCodeInput,
          storeHoursInput,
          storeDirectionsInput,
          companyEmailGroup
        ).catch((error) => {
          console.error('Import failed:', error);
        });
      }
      e.target.value = '';
    });

  // ---- Tauri download folder integration ----
  const downloadFolderInput = document.getElementById('downloadFolderPath');
  const chooseDownloadFolderBtn = document.getElementById(
    'chooseDownloadFolderBtn'
  );

  if (downloadFolderInput && chooseDownloadFolderBtn) {
    if (window.__TAURI__ && window.__TAURI__.core) {
      const invoke = window.__TAURI__.core.invoke;

      invoke('get_download_dir')
        .then((dir) => {
          if (dir) {
            downloadFolderInput.value = dir;
          }
        })
        .catch((err) => {
          console.error('Error getting download dir from Tauri:', err);
          const localDir = localStorage.getItem('downloadFolderPath');
          if (localDir) {
            downloadFolderInput.value = localDir;
          }
        });

      chooseDownloadFolderBtn.addEventListener('click', async () => {
        try {
          const dir = await invoke('choose_download_dir');
          if (dir) {
            downloadFolderInput.value = dir;
            localStorage.setItem('downloadFolderPath', dir);
            showToast(`Download folder set to: ${dir}`);
          }
        } catch (err) {
          if (err !== 'No folder selected') {
            console.error('Error choosing download folder:', err);
            showToast('Error choosing download folder');
          }
        }
      });
    } else {
      downloadFolderInput.value = 'Browser: uses system Downloads folder';
      chooseDownloadFolderBtn.disabled = true;
      chooseDownloadFolderBtn.textContent = 'Desktop app only';
    }
  }

  // ---- Form submission ----
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    hideError('phoneError');
    hideError('emailError');
    hideError('companyEmailError');
    hideError('hoursError');
    hideError('plusCodeError');
    hideValidationSummary();

    const formData = {
      employeeName: document.getElementById('employeeName').value.trim(),
      jobTitle: jobTitleInput.value.trim(),
      companyEmail: companyEmailInput.value.trim(),
      storeName: storeNameInput.value.trim(),
      storeLocation: storeLocationInput.value.trim(),
      storePhone: storePhoneInput.value.trim(),
      storeEmail: storeEmailInput.value.trim(),
      storeAddress: storeAddressInput.value.trim(),
      storePlusCode: storePlusCodeInput.value.trim(),
      storeHours: storeHoursInput.value.trim(),
      storeDirections: storeDirectionsInput.value.trim(),
    };

    const missingFields = [];

    if (!formData.employeeName) missingFields.push('Your Name');
    if (!formData.jobTitle) missingFields.push('Job Title');
    if (!formData.storeName) missingFields.push('Store Name');
    if (!formData.storeLocation) missingFields.push('Store Location');
    if (!formData.storeAddress) missingFields.push('Store Address');

    const phoneValidation = validatePhone(formData.storePhone);
    if (!formData.storePhone) {
      missingFields.push('Store Phone');
    } else if (!phoneValidation.isValid) {
      showError('phoneError', phoneValidation.error);
      missingFields.push('Store Phone (invalid format)');
    }

    const emailValidation = validateEmail(formData.storeEmail);
    if (!formData.storeEmail) {
      missingFields.push('Store Email');
    } else if (!emailValidation.isValid) {
      showError('emailError', emailValidation.error);
      missingFields.push('Store Email (invalid format)');
    }

    const companyEmailValidation = validateCompanyEmail(
      formData.companyEmail,
      formData.jobTitle
    );
    if (!companyEmailValidation.isValid) {
      showError('companyEmailError', companyEmailValidation.error);
      missingFields.push('Company Email');
    }

    const hoursValidation = validateStoreHours(formData.storeHours);
    if (!formData.storeHours) {
      missingFields.push('Store Hours');
    } else if (!hoursValidation.isValid) {
      showError('hoursError', hoursValidation.error);
      missingFields.push('Store Hours (invalid format)');
    }

    const plusCodeValidation = validatePlusCode(formData.storePlusCode);
    if (!plusCodeValidation.isValid) {
      showError('plusCodeError', plusCodeValidation.error);
      missingFields.push('Plus Code (invalid format)');
    }

    if (missingFields.length > 0) {
      showValidationSummary(missingFields);
      showToast('Please complete all required fields', 'error');
      return;
    }

    try {
      saveUserProfile(formData);
      showToast('Profile saved successfully!');

      setTimeout(() => {
        if (returnUrl) {
          const decodedUrl = decodeURIComponent(returnUrl);
          if (decodedUrl.endsWith('.html') && !decodedUrl.includes('://')) {
            window.location.href = decodedUrl;
          } else {
            window.location.href = 'index.html';
          }
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);
    } catch (e) {
      console.error('Error saving user data:', e);
      showToast('Error saving profile. Please try again.');
    }
  });

  // ---- Page transitions ----
  initPageTransitions();
});
