// Pure helpers for building promotion email template configuration objects.
// These functions do not touch the DOM or IndexedDB; they just shape data.

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Build the configuration object used for saving the promotion template
 * into localStorage ("savedPromotionTemplate").
 *
 * This matches the structure previously created in ui.js: it stores
 * only PDF metadata (no binary data) and includes a savedAt timestamp.
 */
export function buildSavedPromotionConfig({
  promoDateRange = '',
  promoYear = '',
  promoTitle = '',
  bulkEmailRecipients = '',
  promotionEntries = [],
  specialHours = [],
  howToShopItems = [],
  importantNotesItems = [],
  attachedPDFs = [],
  generatedSubjectLines = [],
  selectedSubjectLine = null,
  now = new Date(),
}) {
  const trimmedBulk = bulkEmailRecipients || '';

  // Store only PDF metadata here; binary data lives in IndexedDB.
  const pdfMetadata = attachedPDFs.map((pdf) => ({
    id: pdf.id,
    name: pdf.name,
    size: pdf.size,
    type: pdf.type,
  }));

  return {
    // Metadata
    templateType: 'promotion-email',
    version: '1.0',
    savedAt: now.toISOString(),

    // Form fields
    dateRange: promoDateRange || '',
    year: promoYear || '',
    title: promoTitle || '',
    bulkEmailRecipients: trimmedBulk,

    // Data arrays (deep-cloned for safety)
    promotionEntries: deepClone(promotionEntries),
    specialHours: deepClone(specialHours),
    howToShopItems: deepClone(howToShopItems),
    importantNotesItems: deepClone(importantNotesItems),

    // PDF metadata only (no data field)
    attachedPDFs: deepClone(pdfMetadata),

    generatedSubjectLines: deepClone(generatedSubjectLines),
    selectedSubjectLine,
  };
}

/**
 * Build the configuration object used when exporting the promotion
 * template to a JSON file. This version includes full attachedPDFs
 * (including data) and an exportedAt timestamp.
 *
 * NOTE: Sensitive and store-specific fields are excluded for privacy
 * and to ensure templates can be safely shared between stores.
 * Excluded: bulkEmailRecipients, howToShopItems, importantNotesItems
 */
export function buildExportedPromotionConfig({
  promoDateRange = '',
  promoYear = '',
  promoTitle = '',
  bulkEmailRecipients = '', // Excluded for privacy
  promotionEntries = [],
  specialHours = [],
  howToShopItems = [], // Excluded - store-specific
  importantNotesItems = [], // Excluded - may contain store-specific data
  attachedPDFs = [],
  generatedSubjectLines = [],
  selectedSubjectLine = null,
  now = new Date(),
}) {
  return {
    // Metadata
    templateType: 'promotion-email',
    version: '1.0',
    exportedAt: now.toISOString(),

    // Form fields
    dateRange: promoDateRange || '',
    year: promoYear || '',
    title: promoTitle || '',

    // Data arrays (deep-cloned for safety)
    promotionEntries: deepClone(promotionEntries),
    specialHours: deepClone(specialHours),
    attachedPDFs: deepClone(attachedPDFs),
    generatedSubjectLines: deepClone(generatedSubjectLines),
    selectedSubjectLine,
  };
}

/**
 * Validate and normalize an imported promotion template configuration.
 *
 * This is a pure helper used by ui.applyImportedConfig. It does not show
 * toasts or touch the DOM; instead it returns a structured result that
 * the UI layer can interpret.
 */
export function validateAndNormalizeImportedConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') {
    return { ok: false, reason: 'notObject' };
  }

  // Clone so callers can safely mutate the returned config
  const config = deepClone(rawConfig);

  // Check template type if present (backwards compatible)
  if (config.templateType && config.templateType !== 'promotion-email') {
    return { ok: false, reason: 'wrongType' };
  }

  // Helper to validate array-typed fields that are required when present
  function ensureArrayField(field, reasonKey) {
    if (!Array.isArray(config[field])) {
      if (config[field] !== undefined) {
        // Caller should treat this as a hard validation error
        return reasonKey;
      }
      config[field] = [];
    }
    return null;
  }

  const arrayFieldErrors = [
    ensureArrayField('promotionEntries', 'promotionEntriesNotArray'),
    ensureArrayField('specialHours', 'specialHoursNotArray'),
    ensureArrayField('howToShopItems', 'howToShopItemsNotArray'),
    ensureArrayField('importantNotesItems', 'importantNotesItemsNotArray'),
  ].filter(Boolean);

  if (arrayFieldErrors.length > 0) {
    // Report the first problem; UI can map this to a toast message
    return { ok: false, reason: arrayFieldErrors[0] };
  }

  // Optional arrays default to [] if missing
  if (!Array.isArray(config.attachedPDFs)) {
    config.attachedPDFs = [];
  }
  if (!Array.isArray(config.generatedSubjectLines)) {
    config.generatedSubjectLines = [];
  }

  return { ok: true, config };
}
