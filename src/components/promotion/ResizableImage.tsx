/**
 * ResizableImage — Custom TipTap Image extension with:
 * - Corner-drag proportional resizing
 * - Alignment (left / center / right)
 * - Click-through link (href)
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const aspectRatioRef = useRef<number>(1);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const img = imgRef.current;
      if (!img) return;

      const startX = e.clientX;
      const startWidth = img.offsetWidth;
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(50, Math.min(600, startWidth + delta));
        updateAttributes({ width: newWidth });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [updateAttributes]
  );

  const handleLinkSubmit = useCallback(() => {
    updateAttributes({ href: linkValue || null });
    setShowLinkInput(false);
  }, [linkValue, updateAttributes]);

  const alignStyle: React.CSSProperties =
    align === 'center'
      ? { display: 'block', margin: '8px auto' }
      : align === 'right'
        ? { display: 'block', marginLeft: 'auto', marginRight: 0 }
        : { display: 'block', marginLeft: 0, marginRight: 'auto' };

  return (
    <NodeViewWrapper
      className={cn('relative group', isResizing && 'select-none')}
      style={alignStyle}
      data-drag-handle=""
    >
      {/* Floating toolbar */}
      {selected && !isResizing && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-md border bg-background shadow-md px-1 py-0.5 z-20">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent',
                  align === 'left' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'left' })}
              >
                <AlignLeft className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent',
                  align === 'center' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'center' })}
              >
                <AlignCenter className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align center</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent',
                  align === 'right' && 'bg-accent'
                )}
                onClick={() => updateAttributes({ align: 'right' })}
              >
                <AlignRight className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align right</TooltipContent>
          </Tooltip>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent',
                  href && 'text-primary'
                )}
                onClick={() => {
                  setLinkValue(href || 'https://');
                  setShowLinkInput(!showLinkInput);
                }}
              >
                <LinkIcon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add link</TooltipContent>
          </Tooltip>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent text-destructive"
                onClick={deleteNode}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete image</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Link input */}
      {showLinkInput && selected && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-md border bg-background shadow-md px-2 py-1 z-20">
          <input
            type="text"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLinkSubmit();
            }}
            placeholder="https://"
            className="h-6 w-48 rounded border bg-transparent px-2 text-xs outline-none"
            autoFocus
          />
          <button
            type="button"
            className="h-6 px-2 rounded bg-primary text-primary-foreground text-xs"
            onClick={handleLinkSubmit}
          >
            OK
          </button>
          {href && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center rounded text-xs hover:bg-accent text-destructive"
                  onClick={() => {
                    updateAttributes({ href: null });
                    setShowLinkInput(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
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

      {/* Resize handles (visible when selected) */}
      {selected && (
        <>
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize z-10"
            onMouseDown={handleResizeStart}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-bl cursor-ne-resize z-10"
            onMouseDown={handleResizeStart}
          />
        </>
      )}

      {/* Link badge */}
      {href && (
        <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white truncate max-w-[200px] pointer-events-none">
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
