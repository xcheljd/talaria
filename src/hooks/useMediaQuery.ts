/**
 * Media-query hook used to render a single responsive layout.
 *
 * PromotionPage previously mounted both the desktop and mobile layouts and
 * hid one with CSS — doubling every card, editor, and preview iframe.
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Matches the Tailwind `lg` breakpoint used by the promotion layout. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
