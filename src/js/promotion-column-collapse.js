/**
 * Column Collapse Animation System
 * Handles smooth transitions between left and center editing columns
 */

import { promotionState } from './promotion-state.js';

const MOBILE_BREAKPOINT = 1024;

/**
 * Initialize column collapse functionality
 */
export function initColumnCollapse() {
  // Don't initialize on mobile
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    return;
  }

  const leftColumn = document.querySelector('.left-column');
  const centerColumn = document.querySelector('.center-column');
  const rightColumn = document.querySelector('.right-column');
  const container = document.querySelector('.container.three-column');

  if (!leftColumn || !centerColumn || !rightColumn || !container) {
    console.warn('Column collapse: Required elements not found');
    return;
  }

  // Get skinny wrappers by ID (they're now outside columns for proper fixed positioning)
  const leftSkinny = document.getElementById('left-skinny-wrapper');
  const centerSkinny = document.getElementById('center-skinny-wrapper');

  if (!leftSkinny || !centerSkinny) {
    console.warn('Column collapse: Skinny wrappers not found');
    return;
  }

  // Always default to left expanded on page load (don't persist state across refreshes)
  const defaultState = 'left-expanded';
  // Apply state on next frame to ensure fade-in animation plays
  requestAnimationFrame(() => {
    applyColumnState(
      defaultState,
      leftColumn,
      centerColumn,
      rightColumn,
      container
    );
  });

  // Set up click handlers for individual card titles
  setupCardTitleHandlers(leftSkinny, 'left');
  setupCardTitleHandlers(centerSkinny, 'center');

  // Fallback: click anywhere on wrapper (if not a card title) expands column
  leftSkinny.addEventListener('click', (e) => {
    if (!e.target.closest('.skinny-card-title')) {
      expandLeftColumn();
    }
  });
  centerSkinny.addEventListener('click', (e) => {
    if (!e.target.closest('.skinny-card-title')) {
      expandCenterColumn();
    }
  });

  // Keyboard support
  leftSkinny.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expandLeftColumn();
    }
  });

  centerSkinny.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expandCenterColumn();
    }
  });

  // Handle window resize - disable on mobile
  // Debounce with fast transition timing (150ms matches --transition-fast)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        // Reset to default state on mobile
        leftColumn.classList.remove('column-expanded', 'column-collapsed');
        centerColumn.classList.remove('column-expanded', 'column-collapsed');
        rightColumn.classList.remove('preview-expanded');
        container.classList.remove('preview-expanded');
        // Hide skinny wrappers on mobile
        leftSkinny.classList.remove('column-active');
        centerSkinny.classList.remove('column-active');
      } else {
        // Reapply default state when returning to desktop
        applyColumnState(
          'left-expanded',
          leftColumn,
          centerColumn,
          rightColumn,
          container
        );
      }
    }, 150); // Uses --transition-fast timing
  });
}

/**
 * Expand left column, collapse center
 */
export function expandLeftColumn() {
  const state = 'left-expanded';
  const leftColumn = document.querySelector('.left-column');
  const centerColumn = document.querySelector('.center-column');
  const rightColumn = document.querySelector('.right-column');
  const container = document.querySelector('.container.three-column');

  applyColumnState(state, leftColumn, centerColumn, rightColumn, container);
  // Note: State is not persisted across page refreshes (always defaults to left)
}

/**
 * Expand center column, collapse left
 */
export function expandCenterColumn() {
  const state = 'center-expanded';
  const leftColumn = document.querySelector('.left-column');
  const centerColumn = document.querySelector('.center-column');
  const rightColumn = document.querySelector('.right-column');
  const container = document.querySelector('.container.three-column');

  applyColumnState(state, leftColumn, centerColumn, rightColumn, container);
  // Note: State is not persisted across page refreshes (always defaults to left)
}

/**
 * Apply column state to DOM
 * @param {string} state - 'left-expanded' or 'center-expanded'
 * @param {HTMLElement} leftColumn - Left column element
 * @param {HTMLElement} centerColumn - Center column element
 * @param {HTMLElement} rightColumn - Right column element
 * @param {HTMLElement} container - Container element
 */
function applyColumnState(
  state,
  leftColumn,
  centerColumn,
  rightColumn,
  container
) {
  if (!leftColumn || !centerColumn || !rightColumn || !container) return;

  // Get skinny wrappers by ID (they're outside columns for proper fixed positioning)
  const leftSkinny = document.getElementById('left-skinny-wrapper');
  const centerSkinny = document.getElementById('center-skinny-wrapper');

  // Preview is always expanded when column collapse is active (either column is collapsed)
  rightColumn.classList.add('preview-expanded');
  container.classList.add('preview-expanded');

  if (state === 'left-expanded') {
    // Left expanded, center collapsed
    leftColumn.classList.add('column-expanded');
    leftColumn.classList.remove('column-collapsed');
    centerColumn.classList.add('column-collapsed');
    centerColumn.classList.remove('column-expanded');

    // Show center skinny wrapper (for collapsed center column), hide left
    if (leftSkinny) {
      leftSkinny.classList.remove('column-active');
      leftSkinny.setAttribute('aria-expanded', 'true');
    }
    if (centerSkinny) {
      centerSkinny.classList.add('column-active');
      centerSkinny.setAttribute('aria-expanded', 'false');
    }

    // Update state
    promotionState.columnState = 'left-expanded';
    announceColumnChange('Promo Body Details', true);
  } else if (state === 'center-expanded') {
    // Center expanded, left collapsed
    leftColumn.classList.add('column-collapsed');
    leftColumn.classList.remove('column-expanded');
    centerColumn.classList.add('column-expanded');
    centerColumn.classList.remove('column-collapsed');

    // Show left skinny wrapper (for collapsed left column), hide center
    if (leftSkinny) {
      leftSkinny.classList.add('column-active');
      leftSkinny.setAttribute('aria-expanded', 'false');
    }
    if (centerSkinny) {
      centerSkinny.classList.remove('column-active');
      centerSkinny.setAttribute('aria-expanded', 'true');
    }

    // Update state
    promotionState.columnState = 'center-expanded';
    announceColumnChange('Email Tools', true);
  }
}

// Column state is no longer persisted to localStorage
// Always defaults to 'left-expanded' on page load

/**
 * Announce column change to screen readers
 * @param {string} columnName - Name of the column
 * @param {boolean} expanded - Whether the column is expanded
 */
function announceColumnChange(columnName, expanded) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = expanded
    ? `${columnName} column expanded`
    : `${columnName} column collapsed`;
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Map skinny bar titles to their corresponding card IDs
 */
const cardTitleMap = {
  left: {
    'Basic Details': 'basicDetailsCard',
    'Discount Entries': 'discountEntriesCard',
    'How to Shop': 'howToShopCard',
    'Important Notes': 'importantNotesCard',
    'Special Hours': 'specialHoursCard',
  },
  center: {
    'PDF Attachments': 'pdfCard',
    'Subject Lines': 'subjectCard',
    'Bulk Email Tools': 'bulkEmailCard',
  },
};

/**
 * Set up click handlers for individual card titles in a skinny wrapper
 * @param {HTMLElement} skinnyWrapper - The skinny wrapper element
 * @param {string} columnType - 'left' or 'center'
 */
function setupCardTitleHandlers(skinnyWrapper, columnType) {
  const titles = skinnyWrapper.querySelectorAll('.skinny-card-title');

  titles.forEach((title, index) => {
    title.addEventListener('click', (e) => {
      e.stopPropagation();

      // Expand the appropriate column
      if (columnType === 'left') {
        expandLeftColumn();
      } else {
        expandCenterColumn();
      }

      // Get the title text and find corresponding card
      const titleText = title.textContent.trim();
      const cardId = cardTitleMap[columnType]?.[titleText];

      if (cardId) {
        // Slight delay to ensure column expansion animation is done
        requestAnimationFrame(() => {
          expandAndScrollToCard(cardId, columnType, index, titles.length);
        });
      }
    });
  });
}

/**
 * Expand a card and scroll it into view
 * @param {string} cardId - The ID of the card to expand
 * @param {string} columnType - 'left' or 'center'
 * @param {number} cardIndex - Index of the card in the skinny bar (0 = top, etc)
 * @param {number} totalCards - Total number of cards in the column
 */
function expandAndScrollToCard(cardId, columnType, cardIndex, totalCards) {
  const card = document.getElementById(cardId);
  if (!card) return;

  // Remove collapsed class to expand the card
  card.classList.remove('collapsed');

  // Use scrollIntoView to bring the top border of the card to the top of the viewport
  // Wait a tick for the card to finish expanding
  setTimeout(() => {
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 50);
}

/**
 * Toggle between columns (utility function)
 */
export function toggleColumn() {
  const currentState = promotionState.columnState;
  if (currentState === 'left-expanded') {
    expandCenterColumn();
  } else {
    expandLeftColumn();
  }
}
