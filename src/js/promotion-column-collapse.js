/**
 * Column Collapse Animation System
 * Handles smooth transitions between left and center editing columns
 */

import { promotionState } from './promotion-state.js';

const COLUMN_STATE_KEY = 'promotion-column-state';
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

  // Restore saved state or default to left expanded
  const savedState = localStorage.getItem(COLUMN_STATE_KEY) || 'left-expanded';
  // Apply state on next frame to ensure fade-in animation plays
  requestAnimationFrame(() => {
    applyColumnState(savedState, leftColumn, centerColumn, rightColumn, container);
  });

  // Set up click handlers
  leftSkinny.addEventListener('click', () => expandLeftColumn());
  centerSkinny.addEventListener('click', () => expandCenterColumn());

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
        // Reapply state when returning to desktop
        const currentState = localStorage.getItem(COLUMN_STATE_KEY) || 'left-expanded';
        applyColumnState(currentState, leftColumn, centerColumn, rightColumn, container);
      }
    }, 150);
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
  saveColumnState(state);
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
  saveColumnState(state);
}

/**
 * Apply column state to DOM
 * @param {string} state - 'left-expanded' or 'center-expanded'
 * @param {HTMLElement} leftColumn - Left column element
 * @param {HTMLElement} centerColumn - Center column element
 * @param {HTMLElement} rightColumn - Right column element
 * @param {HTMLElement} container - Container element
 */
function applyColumnState(state, leftColumn, centerColumn, rightColumn, container) {
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

/**
 * Save column state to localStorage
 * @param {string} state - Column state to save
 */
function saveColumnState(state) {
  try {
    localStorage.setItem(COLUMN_STATE_KEY, state);
  } catch (e) {
    console.warn('Failed to save column state:', e);
  }
}

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
