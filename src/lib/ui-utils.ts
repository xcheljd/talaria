/**
 * Shared UI utilities.
 *
 * Reduced-motion + OS detection helpers shared across the app. Toast UI is
 * handled by Sonner, screen-reader announcements piggyback on Sonner's own
 * aria-live regions, and the preview iframe is no longer used — those legacy
 * helpers were removed.
 */

/**
 * Check if the user prefers reduced motion (OS accessibility setting).
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll behavior that honors the user's reduced-motion preference.
 * Use this for any `scrollIntoView` / `scrollTo` call so users who request
 * reduced motion get instant jumps instead of smooth scrolling.
 */
export function getScrollBehavior(): 'smooth' | 'auto' {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Detect the user's operating system. Prefers the User-Agent Client Hints
 * API; falls back to the deprecated `navigator.platform`, then userAgent.
 */
export function detectOS(): 'windows' | 'mac' | 'other' {
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const platform = (
    uaData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    ''
  ).toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'mac';
  return 'other';
}

/**
 * Get the recommended email file format based on OS.
 * Mac Outlook opens `.emltpl` as a draft template; other clients use `.eml`.
 */
export function getRecommendedFormat(): 'emltpl' | 'eml' {
  const os = detectOS();
  return os === 'mac' ? 'emltpl' : 'eml';
}
