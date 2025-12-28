/**
 * Page Transitions Module
 * Handles fade transitions for multi-page navigation
 * Uses --transition-base (300ms) from CSS
 */

const TRANSITION_DURATION = 300; // matches --transition-base CSS variable

/**
 * Initialize page transitions
 * Handles fade-out on navigation; fade-in is handled by CSS automatically
 */
export function initPageTransitions() {
  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    if (link.hostname === window.location.hostname) {
      link.addEventListener('click', handleNavigation);
    }
  });

  // Safari/back-forward-cache reliability:
  // - bfcache can restore the previous DOM with .fade-out still applied
  // - some browsers (notably Safari) can also skip re-running CSS animations on reload
  window.addEventListener('pageshow', handlePageShow);
}

function handlePageShow(event) {
  const navType =
    performance.getEntriesByType('navigation')?.[0]?.type || 'navigate';

  const selectors = ['.page-content', '.header', '.right-column'];
  const nodes = selectors
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);

  // Always remove any lingering fade-out class.
  // This is critical for bfcache restores, but harmless on normal navigation.
  nodes.forEach((el) => el.classList.remove('fade-out'));
  document
    .querySelectorAll('.column-skinny-wrapper.fade-out')
    .forEach((el) => el.classList.remove('fade-out'));

  // Animation reliability:
  // - On very fast navigations, CSS animations can start before the first paint.
  // - On Safari, animations can also fail to replay on bfcache restores.
  // Restart the entrance animations on every pageshow, but schedule it after paint.
  const shouldRestart =
    event.persisted ||
    navType === 'back_forward' ||
    navType === 'reload' ||
    navType === 'navigate';

  if (shouldRestart) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restartAnimations(nodes);
      });
    });
  }
}

function restartAnimations(elements) {
  elements.forEach((el) => {
    // Temporarily disable animation so the browser considers it "new".
    el.style.animation = 'none';
    // Force reflow
    void el.offsetHeight;
    // Restore to stylesheet-defined animation
    el.style.animation = '';
  });
}

/**
 * Handle navigation click with fade-out transition
 */
function handleNavigation(event) {
  // Skip if modifier key pressed (user wants new tab)
  if (event.metaKey || event.ctrlKey || event.shiftKey) return;

  // Skip if link has target="_blank"
  if (event.currentTarget.target === '_blank') return;

  event.preventDefault();
  const href = event.currentTarget.getAttribute('href');

  const pageContent = document.querySelector('.page-content');
  const header = document.querySelector('.header');
  const rightColumn = document.querySelector('.right-column');
  const skinnyColumn = document.querySelector(
    '.column-skinny-wrapper.column-active'
  );

  if (pageContent || header) {
    if (pageContent) pageContent.classList.add('fade-out');
    if (header) header.classList.add('fade-out');
    if (rightColumn) rightColumn.classList.add('fade-out');
    if (skinnyColumn) skinnyColumn.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = href;
    }, TRANSITION_DURATION);
  } else {
    window.location.href = href;
  }
}
