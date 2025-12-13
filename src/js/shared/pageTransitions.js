/**
 * Page Transitions Module
 * Handles blur-fade transitions for multi-page navigation
 */

const TRANSITION_DURATION = 300; // matches --transition-base (0.3s)

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
