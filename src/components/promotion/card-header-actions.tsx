/**
 * Lets an editor render buttons into its card's header (shadcn CardAction)
 * while keeping the logic inside the editor. PromotionCard provides the
 * header element; outside a card (unit tests, showcase) the actions render
 * inline so the editor still works on its own.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** undefined = not inside a PromotionCard; null = card header not mounted yet. */
export const CardHeaderActionsContext = createContext<
  HTMLElement | null | undefined
>(undefined);

export function CardHeaderActions({ children }: { children: ReactNode }) {
  const target = useContext(CardHeaderActionsContext);
  if (target === undefined)
    return <div className="flex items-center gap-1">{children}</div>;
  if (target === null) return null;
  return createPortal(children, target);
}
