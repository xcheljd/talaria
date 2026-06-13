/**
 * Custom TipTap extensions and the lowlight instance used by the Newsletter
 * editor. Extracted from NewsletterEditor so the editor file holds the
 * component and its toolbar, not the ProseMirror plumbing.
 */

import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { common, createLowlight } from 'lowlight';

import { compressImage } from './image-utils';

// ===== Font Size Extension =====

export const FONT_SIZES = [12, 14, 16, 18, 20, 24] as const;

export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: { chain: any }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: any }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    } as any;
  },
});

// ===== XSS Sanitization Extension =====

/** TipTap extension that strips dangerous HTML from pasted content. */
export const SanitizePasteExtension = Extension.create({
  name: 'sanitizePaste',
  priority: 110,

  transformPastedHTML(html) {
    let cleanHtml = html;

    // Remove script tags and their contents
    cleanHtml = cleanHtml.replace(
      /<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gi,
      ''
    );

    // Remove event handler attributes (onclick, onerror, onload, etc.)
    cleanHtml = cleanHtml.replace(
      /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      ''
    );

    // Remove javascript: protocol from href attributes
    cleanHtml = cleanHtml.replace(
      /href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
      'href="#"'
    );

    return cleanHtml;
  },
});

// ===== Lowlight instance for code block syntax highlighting =====
export const lowlight = createLowlight(common);

// ===== Drag Handle Extension =====

const DRAGGABLE_NODES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'table',
  'horizontalRule',
  'image',
]);

const dragHandlePluginKey = new PluginKey('dragHandle');

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    let editorView: any = null;

    return [
      new Plugin({
        key: dragHandlePluginKey,
        view(initialView) {
          editorView = initialView;

          // Delegated mousedown — one listener on the editor root instead of per-block
          const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const handle = target.closest('.drag-handle') as HTMLElement | null;
            if (!handle || !editorView) return;
            e.preventDefault();
            const pos = parseInt(handle.dataset.pos ?? '', 10);
            if (isNaN(pos)) return;
            const sel = NodeSelection.create(editorView.state.doc, pos);
            editorView.dispatch(editorView.state.tr.setSelection(sel));
          };

          initialView.dom.addEventListener('mousedown', handleMouseDown);

          return {
            update(v) {
              editorView = v;
            },
            destroy() {
              initialView.dom.removeEventListener('mousedown', handleMouseDown);
              editorView = null;
            },
          };
        },
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.forEach((node, pos) => {
              if (DRAGGABLE_NODES.has(node.type.name)) {
                const handle = document.createElement('div');
                handle.className = 'drag-handle';
                handle.contentEditable = 'false';
                handle.draggable = true;
                handle.dataset.pos = String(pos);

                // Build SVG via DOM to avoid innerHTML
                const ns = 'http://www.w3.org/2000/svg';
                const svg = document.createElementNS(ns, 'svg');
                svg.setAttribute('width', '10');
                svg.setAttribute('height', '10');
                svg.setAttribute('viewBox', '0 0 10 10');
                svg.setAttribute('fill', 'currentColor');
                for (const [cx, cy] of [
                  [3, 2],
                  [7, 2],
                  [3, 5],
                  [7, 5],
                  [3, 8],
                  [7, 8],
                ] as [number, number][]) {
                  const circle = document.createElementNS(ns, 'circle');
                  circle.setAttribute('cx', String(cx));
                  circle.setAttribute('cy', String(cy));
                  circle.setAttribute('r', '1');
                  svg.appendChild(circle);
                }
                handle.appendChild(svg);

                decorations.push(Decoration.widget(pos, handle, { side: -1 }));
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export const DropImageExtension = Extension.create({
  name: 'dropImage',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dropImage'),
        props: {
          handleDrop(view, event: DragEvent) {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            const imageFile = Array.from(files).find((f) =>
              f.type.startsWith('image/')
            );
            if (!imageFile) return false;

            event.preventDefault();

            const reader = new FileReader();
            reader.onload = async () => {
              const dataUrl = reader.result as string;
              const { src } = await compressImage(dataUrl);
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return;

              const node = view.state.schema.nodes.image;
              if (node) {
                const imageNode = node.create({ src });
                const tr = view.state.tr.insert(pos.pos, imageNode);
                view.dispatch(tr);
              }
            };
            reader.readAsDataURL(imageFile as Blob);
            return true;
          },
        },
      }),
    ];
  },
});
