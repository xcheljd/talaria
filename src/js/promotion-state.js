/**
 * Promotion State Management Module
 * Handles state for promotion email template
 */

/**
 * Promotion application state
 */
export const promotionState = {
  promotionEntries: [],
  specialHours: [],
  howToShopItems: [],
  importantNotesItems: [],
  attachedPDFs: [],
  generatedSubjectLines: [],
  selectedSubjectLine: null,
  howToShopExpanded: false,
  importantNotesExpanded: false,
  entryCollapsedStates: {},
};
