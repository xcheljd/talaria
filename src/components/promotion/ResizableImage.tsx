/**
 * ResizableImage — Custom TipTap Image extension with:
 * - Corner-drag proportional resizing
 * - Alignment (left / center / right)
 * - Click-through link (href)
 * - Size presets (25/50/75/100% of the column) + exact pixel width
 * - Alt text (read by screen readers; shown when email images are blocked)
 *
 * Uses a React NodeView for the interactive resize handles and
 * floating toolbar.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useCallback, useRef, useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Trash2,
  X,
  Scaling,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ===== NodeView Component =====

function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  deleteNode: () => void;
  selected: boolean;
}) {
  const { src, alt, width, align, href } = node.attrs;
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState(href || '');

  /**
   * Corner-drag resize. Pointer events + pointer capture (not document
   * mouse listeners) so the drag keeps tracking in WebKit-based webviews,
   * where the node's native drag-and-drop otherwise swallows mousemove.
   * `side` is which edge the handle sits on: dragging a left handle
   * leftward grows the image (needed for right-aligned images).
   */
  const handleResizeStart = useCallback(
    (side: 'left' | 'right') => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;

      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = img.offsetWidth;
      // Never grow past the editor column (the email body is 600px max).
      const maxWidth = Math.min(
        600,
        img.closest('.tiptap')?.clientWidth ?? 600
      );

      const onMove = (moveEvent: PointerEvent) => {
        const delta = (moveEvent.clientX - startX) * (side === 'left' ? -1 : 1);
        const newWidth = Math.round(
          Math.max(50, Math.min(maxWidth, startWidth + delta))
        );
        updateAttributes({ width: newWidth });
      };

      const onUp = (upEvent: PointerEvent) => {
        setIsResizing(false);
        if (handle.hasPointerCapture(upEvent.pointerId)) {
          handle.releasePointerCapture(upEvent.pointerId);
        }
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    },
    [updateAttributes]
  );

  /** Editor column width, capped at the 600px email body. */
  const columnWidth = () =>
    Math.min(600, imgRef.current?.closest('.tiptap')?.clientWidth || 600);
  const setWidth = (px: number) =>
    updateAttributes({
      width: Math.round(Math.max(50, Math.min(columnWidth(), px))),
    });
  const [widthDraft, setWidthDraft] = useState('');
  const [altDraft, setAltDraft] = useState(alt || '');

  const handleLinkSubmit = useCallback(() => {
    updateAttributes({ href: linkValue || null });
    setShowLinkInput(false);
  }, [linkValue, updateAttributes]);

  // The wrapper shrink-wraps the image (fit-content) so alignment margins
  // move the picture itself and the resize handles sit on its corners. A
  // full-width block wrapper left the image stuck at the left edge with the
  // handles floating at the far right of the editor.
  const alignStyle: React.CSSProperties = {
    display: 'block',
    width: 'fit-content',
    maxWidth: '100%',
    marginTop: 8,
    marginBottom: 8,
    marginLeft: align === 'left' ? 0 : 'auto',
    marginRight: align === 'right' ? 0 : 'auto',
  };

  return (
    <NodeViewWrapper
      className={cn('relative group', isResizing && 'select-none')}
      style={alignStyle}
      data-drag-handle=""
      onDragStart={(e: React.DragEvent) => {
        // Never let a resize turn into a node drag.
        if (isResizing) e.preventDefault();
      }}
    >
      {/* Floating toolbar */}
      {selected && !isResizing && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-md border bg-background shadow-md px-1 py-0.5 z-20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Align left"
                variant="ghost"
                size="icon-xs"
                static
                type="button"
                className={cn(
                  'rounded text-xs',
                  align === 'left' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'left' })}
              >
                <AlignLeft className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Align center"
                variant="ghost"
                size="icon-xs"
                static
                type="button"
                className={cn(
                  'rounded text-xs',
                  align === 'center' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'center' })}
              >
                <AlignCenter className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align center</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Align right"
                variant="ghost"
                size="icon-xs"
                static
                type="button"
                className={cn(
                  'rounded text-xs',
                  align === 'right' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'right' })}
              >
                <AlignRight className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align right</TooltipContent>
          </Tooltip>
          <Separator
            orientation="vertical"
            className="mx-0.5 data-[orientation=vertical]:h-4"
          />
          <Popover
            onOpenChange={(open) => {
              if (open)
                setWidthDraft(
                  String(width ?? imgRef.current?.offsetWidth ?? '')
                );
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    static
                    type="button"
                    data-testid="image-size-btn"
                    aria-label="Image size"
                    className="rounded text-xs"
                  >
                    <Scaling className="size-3" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Image size</TooltipContent>
            </Tooltip>
            <PopoverContent className="flex w-56 flex-col gap-2 p-2">
              <div className="grid grid-cols-4 gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <Button
                    key={pct}
                    variant="outline"
                    size="xs"
                    static
                    type="button"
                    data-testid={`image-size-${pct}`}
                    onClick={() => setWidth((columnWidth() * pct) / 100)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(widthDraft);
                  if (Number.isFinite(n) && n > 0) setWidth(n);
                }}
              >
                <Input
                  type="number"
                  min={50}
                  max={600}
                  value={widthDraft}
                  onChange={(e) => setWidthDraft(e.target.value)}
                  aria-label="Width in pixels"
                  data-testid="image-width-input"
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">px</span>
                <Button size="xs" static type="submit">
                  Set
                </Button>
              </form>
              {width && (
                <Button
                  variant="ghost"
                  size="xs"
                  static
                  type="button"
                  onClick={() => updateAttributes({ width: null })}
                >
                  Reset to original size
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover
            onOpenChange={(open) => {
              if (open) setAltDraft(alt || '');
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    static
                    type="button"
                    data-testid="image-alt-btn"
                    aria-label="Alt text"
                    className={cn('rounded text-xs', alt && 'text-primary')}
                  >
                    <Type className="size-3" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {alt ? `Alt text: ${alt}` : 'Add alt text'}
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="flex w-64 flex-col gap-2 p-2">
              <p className="text-xs text-muted-foreground">
                Describes the image for screen readers and when email apps block
                images.
              </p>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateAttributes({ alt: altDraft.trim() || null });
                }}
              >
                <Input
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  placeholder="e.g. Summer sunglasses lineup"
                  aria-label="Alt text"
                  data-testid="image-alt-input"
                  className="h-7 text-xs"
                />
                <Button size="xs" static type="submit">
                  Save
                </Button>
              </form>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Add link"
                variant="ghost"
                size="icon-xs"
                static
                type="button"
                className={cn('rounded text-xs', href && 'text-primary')}
                onClick={() => {
                  setLinkValue(href || 'https://');
                  setShowLinkInput(!showLinkInput);
                }}
              >
                <LinkIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add link</TooltipContent>
          </Tooltip>
          <Separator
            orientation="vertical"
            className="mx-0.5 data-[orientation=vertical]:h-4"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Delete image"
                variant="ghost"
                size="icon-xs"
                static
                type="button"
                className="rounded text-xs text-destructive hover:text-destructive"
                onClick={deleteNode}
              >
                <Trash2 className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete image</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Link input */}
      {showLinkInput && selected && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-md border bg-background shadow-md px-2 py-1 z-20">
          <Input
            type="text"
            aria-label="Link URL"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLinkSubmit();
            }}
            placeholder="https://"
            className="h-6 w-48 px-2 text-xs md:text-xs"
            autoFocus
          />
          <Button
            size="xs"
            static
            type="button"
            className="rounded bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            onClick={handleLinkSubmit}
          >
            OK
          </Button>
          {href && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Remove link"
                  variant="ghost"
                  size="icon-xs"
                  static
                  type="button"
                  className="rounded text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    updateAttributes({ href: null });
                    setShowLinkInput(false);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove link</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        style={{
          width: width ? `${width}px` : undefined,
          maxWidth: '100%',
          height: 'auto',
        }}
        className={cn(
          'rounded',
          selected && 'ring-2 ring-primary ring-offset-2'
        )}
        draggable={false}
      />

      {/* Resize handles (visible when selected), one per image corner */}
      {selected &&
        (
          [
            ['top-0 left-0 rounded-br cursor-nw-resize', 'left'],
            ['bottom-0 left-0 rounded-tr cursor-sw-resize', 'left'],
            ['top-0 right-0 rounded-bl cursor-ne-resize', 'right'],
            ['bottom-0 right-0 rounded-tl cursor-se-resize', 'right'],
          ] as const
        ).map(([pos, side]) => (
          <div
            key={pos}
            data-testid={`image-resize-${pos.split(' ').slice(0, 2).join('-')}`}
            className={cn('absolute z-10 size-3 touch-none bg-primary', pos)}
            contentEditable={false}
            draggable={false}
            onPointerDown={handleResizeStart(side)}
            // Cancelling pointerdown doesn't stop Chromium (WebView2 on
            // Windows) from starting a native drag of the draggable image
            // node from the follow-up mousedown; cancel that too.
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => e.preventDefault()}
          />
        ))}

      {/* Live width readout while dragging */}
      {isResizing && (
        <div className="pointer-events-none absolute top-1 right-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] text-background">
          {imgRef.current?.offsetWidth ?? width}px
        </div>
      )}

      {/* Link badge */}
      {href && (
        <div className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background truncate max-w-[200px] pointer-events-none">
          {href}
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ===== TipTap Extension =====

export const ResizableImage = Node.create({
  name: 'image',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: 'center' },
      href: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        style: HTMLAttributes.width
          ? `width: ${HTMLAttributes.width}px; max-width: 100%; height: auto;`
          : 'max-width: 100%; height: auto;',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    } as any;
  },
});
