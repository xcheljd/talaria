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
  entryCollapsedStates: {},
  columnState: 'left-expanded', // 'left-expanded' | 'center-expanded'
};
