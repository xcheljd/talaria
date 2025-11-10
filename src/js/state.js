// Import UI functions (will be exported from app.js)
// These are placeholders to resolve no-undef errors for now.
// A better long-term solution would be to use a pub/sub pattern or pass these functions as callbacks.
let updateUndoRedoButtons;
let renderPromotionEntries;
let renderSpecialHours;
let renderHowToShopSection;
let renderImportantNotesSection;
let renderAttachedPDFs;
let renderSubjectLines;

// Function to set UI update callbacks from app.js
export function setUIUpdateCallbacks(callbacks) {
  updateUndoRedoButtons = callbacks.updateUndoRedoButtons;
  renderPromotionEntries = callbacks.renderPromotionEntries;
  renderSpecialHours = callbacks.renderSpecialHours;
  renderHowToShopSection = callbacks.renderHowToShopSection;
  renderImportantNotesSection = callbacks.renderImportantNotesSection;
  renderAttachedPDFs = callbacks.renderAttachedPDFs;
  renderSubjectLines = callbacks.renderSubjectLines;
}

export const appState = {
  currentCategory: 'all',
  currentTemplate: null,
  searchActive: false,
  userProfile: null,
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
  historyStack: [],
  historyIndex: -1,
};

export const MAX_HISTORY = 50;

export function captureState() {
  // Only capture if we're in promotion email mode
  if (appState.currentTemplate !== 'promotion-email') return;

  const state = {
    promotionEntries: JSON.parse(JSON.stringify(appState.promotionEntries)),
    specialHours: JSON.parse(JSON.stringify(appState.specialHours)),
    howToShopItems: JSON.parse(JSON.stringify(appState.howToShopItems)),
    importantNotesItems: JSON.parse(
      JSON.stringify(appState.importantNotesItems)
    ),
    attachedPDFs: JSON.parse(JSON.stringify(appState.attachedPDFs)),
    generatedSubjectLines: JSON.parse(
      JSON.stringify(appState.generatedSubjectLines)
    ),
    selectedSubjectLine: appState.selectedSubjectLine,
  };

  // Remove any states after current index (when making new changes after undo)
  appState.historyStack = appState.historyStack.slice(
    0,
    appState.historyIndex + 1
  );

  // Add new state
  appState.historyStack.push(state);

  // Limit history size
  if (appState.historyStack.length > MAX_HISTORY) {
    appState.historyStack.shift();
  } else {
    appState.historyIndex++;
  }

  updateUndoRedoButtons();
}

export function restoreState(state) {
  appState.promotionEntries = JSON.parse(
    JSON.stringify(state.promotionEntries)
  );
  appState.specialHours = JSON.parse(JSON.stringify(state.specialHours));
  appState.howToShopItems = JSON.parse(JSON.stringify(state.howToShopItems));
  appState.importantNotesItems = JSON.parse(
    JSON.stringify(state.importantNotesItems)
  );
  appState.attachedPDFs = state.attachedPDFs
    ? JSON.parse(JSON.stringify(state.attachedPDFs))
    : [];
  appState.generatedSubjectLines = state.generatedSubjectLines
    ? JSON.parse(JSON.stringify(state.generatedSubjectLines))
    : [];
  appState.selectedSubjectLine = state.selectedSubjectLine || null;

  // Re-render all sections without capturing state
  renderPromotionEntries();
  renderSpecialHours();
  renderHowToShopSection();
  renderImportantNotesSection();
  renderAttachedPDFs();
  renderSubjectLines();
}
