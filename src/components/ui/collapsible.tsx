'use client';

import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden grid transition-[grid-template-rows] ease-in-out',
        'data-[state=closed]:grid-rows-[0fr] data-[state=closed]:duration-250',
        'data-[state=open]:grid-rows-[1fr] data-[state=open]:duration-500',
        className
      )}
      {...props}
    >
      <div className="min-h-0">{props.children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
