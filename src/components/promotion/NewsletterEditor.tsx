/**
 * NewsletterEditor — TipTap rich text editor for the Newsletter card.
 *
 * Provides:
 * - Formatting toolbar: Bold, Italic, Underline, Text Color, Highlight,
 *   H2, H3, Bullet List, Link, Undo, Redo, Alignment
 * - Heading is the first H2 element in the editor body (auto-synced to store)
 * - Position toggle (Top/Bottom) for email placement
 * - Syncs editor content to Zustand store on every change
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from './ResizableImage';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Link2Off,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Strikethrough,
  Trash2,
  ExternalLink,
  ImageIcon,
  Table as TableIcon,
  Plus,
  TableCellsMerge,
  TableCellsSplit,
  Trash2Icon,
  Code,
  Quote,
  Search,
  X,
  ALargeSmall,
  SpellCheck,
  Smile,
  Clock,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeURL } from '@/lib/html-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  type NewsletterPosition,
} from '@/stores/promotion-store';

import { compressImage } from './newsletter/image-utils';
import { EMOJI_LIST } from './newsletter/emoji-data';
import {
  FONT_SIZES,
  FontSize,
  SanitizePasteExtension,
  DragHandleExtension,
  DropImageExtension,
  lowlight,
} from './newsletter/extensions';
import {
  ToolbarButton,
  ToolbarSeparator,
  ColorInput,
} from './newsletter/toolbar';

// ===== Heading Extraction Helper =====

/** Extract the text content of the first H2 element from HTML using DOMParser. */
function extractHeadingFromHTML(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const h2 = doc.querySelector('h2');
  return h2?.textContent?.trim() || '';
}

// ===== Main Component =====

export function NewsletterEditor() {
  const store = usePromotionStore(
    useShallow((s) => ({
      newsletterBody: s.newsletterBody,
      newsletterHeading: s.newsletterHeading,
      newsletterPosition: s.newsletterPosition,
      newsletterStyle: s.newsletterStyle,
      newsletterVisible: s.newsletterVisible,
      emailPalette: s.emailPalette,
      setNewsletterBody: s.setNewsletterBody,
      setNewsletterHeading: s.setNewsletterHeading,
      setNewsletterPosition: s.setNewsletterPosition,
      setNewsletterStyle: s.setNewsletterStyle,
      setNewsletterVisible: s.setNewsletterVisible,
    }))
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [showTableStyle, setShowTableStyle] = useState(false);

  // Track last-used colors for color pickers (#11)
  const [lastTextColor, setLastTextColor] = useState('#000000');
  const [lastHighlightColor, setLastHighlightColor] = useState('#fef08a');

  // Debounce timer for editor updates (#25)
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to skip store-triggered syncs when the editor itself caused the change (#23)
  const isEditorUpdateRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      SanitizePasteExtension,
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
        codeBlock: false,
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: 'Start typing your newsletter content...',
      }),
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CodeBlockLowlight.configure({ lowlight }),
      DropImageExtension,
      DragHandleExtension,
    ],
    content: store.newsletterBody || '<h2>Newsletter</h2><p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Don't update store with empty paragraph
      const isEmpty =
        html === '<p></p>' || html === '<p><br></p>' || html === '';
      const body = isEmpty ? '' : html;

      // Mark that this update came from the editor (#23)
      isEditorUpdateRef.current = true;

      // Debounce store updates during rapid typing (#25)
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(() => {
        store.setNewsletterBody(body);

        // Auto-derive heading from first H2 in editor body
        const heading = body ? extractHeadingFromHTML(body) : '';
        if (heading !== store.newsletterHeading) {
          store.setNewsletterHeading(heading);
        }

        // Reset the editor-originated flag after the store update propagates
        setTimeout(() => {
          isEditorUpdateRef.current = false;
        }, 50);
      }, 150);
    },
    // Force toolbar active state to update on cursor movement / selection changes
    onSelectionUpdate: () => {
      // This triggers a re-render so toolbar buttons reflect current cursor position
    },
  });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Sync editor when store changes from external source (import, Start Over) (#23)
  useEffect(() => {
    if (!editor) return;

    // Skip sync if the editor itself caused the store update
    if (isEditorUpdateRef.current) return;

    const currentEditorHTML = editor.getHTML();
    const storeBody = store.newsletterBody || '<h2>Newsletter</h2><p></p>';

    // Only update if content actually differs (avoid infinite loops)
    if (currentEditorHTML !== storeBody) {
      editor.commands.setContent(storeBody);
    }
  }, [store.newsletterBody, editor]);

  // ===== Position Toggle =====
  const handlePositionChange = useCallback(
    (position: NewsletterPosition) => {
      store.setNewsletterPosition(position);
    },
    [store]
  );

  // ===== Link Handler (popover-based) =====
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');

  const handleLinkClick = useCallback(() => {
    if (!editor) return;

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    // Pre-fill with existing link if any
    const existingUrl = editor.getAttributes('link').href || 'https://';
    setLinkUrl(existingUrl);
    setLinkPopoverOpen(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor || !linkUrl) return;

    if (isSafeURL(linkUrl)) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }

    setLinkPopoverOpen(false);
    setLinkUrl('https://');
  }, [editor, linkUrl]);

  // ===== Color Handlers (#11 - remember last-used colors) =====
  const handleTextColor = useCallback(
    (color: string) => {
      setLastTextColor(color);
      editor?.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const handleHighlight = useCallback(
    (color: string) => {
      setLastHighlightColor(color);
      editor?.chain().focus().toggleHighlight({ color }).run();
    },
    [editor]
  );

  // ===== Image Insertion (#1) =====
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('https://');
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFromUrl = useCallback(() => {
    if (!editor || !imageUrl) return;
    if (isSafeURL(imageUrl)) {
      (editor.chain().focus() as any).setImage({ src: imageUrl }).run();
    }
    setImagePopoverOpen(false);
    setImageUrl('https://');
  }, [editor, imageUrl]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const { src, warning } = await compressImage(dataUrl);
        (editor?.chain().focus() as any).setImage({ src }).run();
        if (warning) {
          // Show a non-blocking console warning; could be upgraded to toast
          console.warn('[Newsletter Image]', warning);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [editor]
  );

  // ===== Table Helpers (#2) =====
  const [tableGridHover, setTableGridHover] = useState({ rows: 0, cols: 0 });
  const insertTable = useCallback(
    (rows: number = 3, cols: number = 3) => {
      editor
        ?.chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    },
    [editor]
  );

  // ===== Find & Replace (#6) =====
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findWholeWord, setFindWholeWord] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  /** Build regex from current find options */
  const buildFindRegex = useCallback(
    (flags: string) => {
      let pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (findWholeWord) pattern = `\\b${pattern}\\b`;
      const regexFlags = findCaseSensitive ? flags.replace('i', '') : flags;
      return new RegExp(pattern, regexFlags);
    },
    [findText, findCaseSensitive, findWholeWord]
  );

  const performFind = useCallback(() => {
    if (!editor || !findText) {
      setFindCount(0);
      return;
    }

    const { state } = editor;
    const { doc } = state;
    let count = 0;
    const regex = buildFindRegex('gi');

    doc.descendants((node) => {
      if (node.isText && node.text) {
        const matches = node.text.match(regex);
        if (matches) count += matches.length;
      }
    });

    setFindCount(count);
  }, [editor, findText, buildFindRegex]);

  const performReplace = useCallback(() => {
    if (!editor || !findText) return;

    const { state } = editor;
    const { tr } = state;
    const regex = buildFindRegex('i');

    let found = false;
    state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText && node.text) {
        const match = node.text.match(regex);
        if (match && match.index !== undefined) {
          const from = pos + match.index;
          const to = from + match[0].length;
          tr.replaceWith(
            from,
            to,
            state.schema.text(match[0].replace(regex, replaceText))
          );
          found = true;
          return false;
        }
      }
    });

    if (found) {
      editor.view.dispatch(tr);
    }
    performFind();
  }, [editor, findText, replaceText, performFind, buildFindRegex]);

  const performReplaceAll = useCallback(() => {
    if (!editor || !findText) return;

    const { state } = editor;
    const { tr } = state;
    const regex = buildFindRegex('gi');

    let offset = 0;
    state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text;
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
          const newText = text.replace(regex, replaceText);
          const adjustedPos = pos + offset;
          tr.replaceWith(
            adjustedPos,
            adjustedPos + node.nodeSize,
            state.schema.text(newText)
          );
          offset += newText.length - text.length;
        }
      }
    });

    editor.view.dispatch(tr);
    performFind();
  }, [editor, findText, replaceText, performFind, buildFindRegex]);

  // ===== Word/Character Count & Read Time =====
  const editorText = editor?.getText() || '';
  const wordCount = editorText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = editorText.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Newsletter content length thresholds for email best practices
  const WORD_WARNING = 500;
  const WORD_DANGER = 1000;

  // ===== Reset Newsletter (#9) =====
  const handleResetNewsletter = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent('<h2>Newsletter</h2><p></p>');
    store.setNewsletterBody('');
    store.setNewsletterHeading('Newsletter');
  }, [editor, store]);

  return (
    <div className="space-y-3">
      {/* Show in Email Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="newsletter-visible-toggle"
          checked={store.newsletterVisible}
          onCheckedChange={(checked) =>
            store.setNewsletterVisible(checked === true)
          }
          data-testid="newsletter-visible-toggle"
        />
        <label
          htmlFor="newsletter-visible-toggle"
          className="text-sm font-medium cursor-pointer select-none"
        >
          Show in Email
        </label>
      </div>

      {/* Heading guidance */}
      <p className="text-[11px] text-muted-foreground leading-snug">
        The first <strong>H2</strong> in the editor becomes the newsletter
        heading.
        {store.newsletterBody &&
          !extractHeadingFromHTML(store.newsletterBody) && (
            <span className="text-orange-500 ml-1">
              No H2 found — click the H2 button to add one.
            </span>
          )}
        {store.newsletterBody &&
          extractHeadingFromHTML(store.newsletterBody) && (
            <span className="text-muted-foreground/70 ml-1">
              Current: &ldquo;{extractHeadingFromHTML(store.newsletterBody)}
              &rdquo;
            </span>
          )}
      </p>

      {/* Position Toggle */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Position in Email
        </label>
        <div className="flex gap-1">
          <Button
            variant={store.newsletterPosition === 'top' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePositionChange('top')}
            data-active={store.newsletterPosition === 'top' || undefined}
            aria-label="Position: Above %"
          >
            <ArrowUpFromLine className="h-3 w-3" />
            Above %
          </Button>
          <Button
            variant={
              store.newsletterPosition === 'bottom' ? 'default' : 'outline'
            }
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePositionChange('bottom')}
            data-active={store.newsletterPosition === 'bottom' || undefined}
            aria-label="Position: Below %"
          >
            <ArrowDownFromLine className="h-3 w-3" />
            Below %
          </Button>
        </div>
      </div>

      {/* Customize Section */}
      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setShowCustomize(!showCustomize)}
          data-testid="newsletter-customize-toggle"
          aria-expanded={showCustomize}
        >
          <span>Customize Border & Background</span>
          {showCustomize ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {showCustomize && (
          <div className="space-y-3 border-t px-3 py-3">
            {/* Border Style Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Border Style
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: 'left', label: 'Left', preview: 'border-l-4' },
                    { value: 'full', label: 'Full', preview: 'border' },
                    { value: 'none', label: 'None', preview: '' },
                    { value: 'top', label: 'Top', preview: 'border-t-4' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex h-8 w-12 items-center justify-center rounded-md border text-[10px] transition-colors ${
                      store.newsletterStyle.borderStyle === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      store.setNewsletterStyle({ borderStyle: opt.value })
                    }
                    aria-label={`Border style: ${opt.label}`}
                    data-testid={`border-style-${opt.value}`}
                  >
                    <div
                      className={`h-5 w-8 bg-muted ${
                        opt.value === 'left'
                          ? 'border-l-[3px] border-l-primary'
                          : opt.value === 'full'
                            ? 'border border-primary'
                            : opt.value === 'top'
                              ? 'border-t-[3px] border-t-primary'
                              : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Pickers */}
            {(
              [
                {
                  key: 'borderColor' as const,
                  label: 'Border Color',
                  autoHint: 'Footer',
                  swatches: [
                    { color: store.emailPalette.footerBg, label: 'Footer' },
                    { color: store.emailPalette.link, label: 'Link' },
                    { color: store.emailPalette.accent, label: 'Accent' },
                    { color: store.emailPalette.text, label: 'Text' },
                  ],
                },
                {
                  key: 'backgroundColor' as const,
                  label: 'Background',
                  autoHint: 'Section',
                  swatches: [
                    { color: store.emailPalette.sectionBg, label: 'Section' },
                    {
                      color: store.emailPalette.unsubscribeBg,
                      label: 'Subtle',
                    },
                    { color: store.emailPalette.footerBg, label: 'Footer' },
                    { color: store.emailPalette.bodyBg, label: 'Body' },
                  ],
                },
                {
                  key: 'headingColor' as const,
                  label: 'Heading Color',
                  autoHint: 'Footer',
                  swatches: [
                    { color: store.emailPalette.footerBg, label: 'Footer' },
                    { color: store.emailPalette.link, label: 'Link' },
                    { color: store.emailPalette.accent, label: 'Accent' },
                    { color: store.emailPalette.text, label: 'Text' },
                  ],
                },
              ] as const
            ).map((picker) => {
              const currentValue = store.newsletterStyle[picker.key];
              return (
                <div key={picker.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground min-w-[90px]">
                      {picker.label}
                    </label>
                    <div
                      className="h-5 w-5 rounded border border-border shrink-0"
                      style={{
                        backgroundColor: currentValue ?? '#888',
                        backgroundImage: currentValue
                          ? undefined
                          : 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)',
                        backgroundSize: currentValue ? undefined : '8px 8px',
                      }}
                      data-testid={`swatch-${picker.key}`}
                    />
                    <input
                      type="color"
                      value={currentValue ?? '#2563eb'}
                      onChange={(e) =>
                        store.setNewsletterStyle({
                          [picker.key]: e.target.value,
                        })
                      }
                      className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                      aria-label={`Pick ${picker.label}`}
                      data-testid={`picker-${picker.key}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                      onClick={() =>
                        store.setNewsletterStyle({ [picker.key]: null })
                      }
                      disabled={currentValue === null}
                      aria-label={`Reset ${picker.label} to auto`}
                      title={`Auto uses email ${picker.autoHint.toLowerCase()} color`}
                      data-testid={`auto-${picker.key}`}
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Auto
                    </Button>
                  </div>
                  {/* Email palette swatches */}
                  <div className="flex items-center gap-1 ml-[98px]">
                    {picker.swatches.map((sw) => (
                      <button
                        key={sw.color}
                        type="button"
                        className={cn(
                          'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                          currentValue === sw.color &&
                            'ring-1 ring-primary ring-offset-1'
                        )}
                        style={{ backgroundColor: sw.color }}
                        onClick={() =>
                          store.setNewsletterStyle({
                            [picker.key]: sw.color,
                          })
                        }
                        title={`${sw.label} (${sw.color})`}
                        aria-label={`Set ${picker.label} to ${sw.label} color`}
                        data-testid={`palette-swatch-${picker.key}-${sw.label.toLowerCase()}`}
                      />
                    ))}
                    <span className="text-[9px] text-muted-foreground ml-1">
                      email colors
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customize Table Style */}
      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setShowTableStyle(!showTableStyle)}
          data-testid="newsletter-table-style-toggle"
          aria-expanded={showTableStyle}
        >
          <span>Customize Table Style</span>
          {showTableStyle ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {showTableStyle && (
          <div className="space-y-3 border-t px-3 py-3">
            {/* Border Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Border Style
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: 'solid', label: 'Solid' },
                    { value: 'dashed', label: 'Dashed' },
                    { value: 'dotted', label: 'Dotted' },
                    { value: 'none', label: 'None' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex h-8 items-center justify-center rounded-md border px-3 text-[10px] transition-colors ${
                      store.newsletterStyle.tableBorderStyle === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      store.setNewsletterStyle({ tableBorderStyle: opt.value })
                    }
                    aria-label={`Table border style: ${opt.label}`}
                    data-testid={`table-border-style-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Width */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Border Width
              </label>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`flex h-8 w-10 items-center justify-center rounded-md border text-[10px] transition-colors ${
                      store.newsletterStyle.tableBorderWidth === w
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      store.setNewsletterStyle({ tableBorderWidth: w })
                    }
                    aria-label={`Table border width: ${w}px`}
                    data-testid={`table-border-width-${w}`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            {/* Border Color */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground min-w-[90px]">
                  Border Color
                </label>
                <div
                  className="h-5 w-5 rounded border border-border shrink-0"
                  style={{
                    backgroundColor:
                      store.newsletterStyle.tableBorderColor ??
                      store.emailPalette.text,
                  }}
                />
                <input
                  type="color"
                  value={
                    store.newsletterStyle.tableBorderColor ??
                    store.emailPalette.text
                  }
                  onChange={(e) =>
                    store.setNewsletterStyle({
                      tableBorderColor: e.target.value,
                    })
                  }
                  className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                  aria-label="Pick table border color"
                  data-testid="picker-tableBorderColor"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                  onClick={() =>
                    store.setNewsletterStyle({ tableBorderColor: null })
                  }
                  disabled={store.newsletterStyle.tableBorderColor === null}
                  aria-label="Reset table border color to auto"
                  title="Auto uses email text color"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-1 ml-[98px]">
                {[
                  { color: store.emailPalette.text, label: 'Text' },
                  { color: store.emailPalette.accent, label: 'Accent' },
                  { color: store.emailPalette.footerBg, label: 'Footer' },
                  { color: store.emailPalette.link, label: 'Link' },
                ].map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    className={cn(
                      'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                      store.newsletterStyle.tableBorderColor === sw.color &&
                        'ring-1 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: sw.color }}
                    onClick={() =>
                      store.setNewsletterStyle({
                        tableBorderColor: sw.color,
                      })
                    }
                    title={`${sw.label} (${sw.color})`}
                    aria-label={`Set table border color to ${sw.label}`}
                  />
                ))}
                <span className="text-[9px] text-muted-foreground ml-1">
                  email colors
                </span>
              </div>
            </div>

            {/* Header Background */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground min-w-[90px]">
                  Header Bg
                </label>
                <div
                  className="h-5 w-5 rounded border border-border shrink-0"
                  style={{
                    backgroundColor:
                      store.newsletterStyle.tableHeaderBg ??
                      store.emailPalette.sectionBg,
                  }}
                />
                <input
                  type="color"
                  value={
                    store.newsletterStyle.tableHeaderBg ??
                    store.emailPalette.sectionBg
                  }
                  onChange={(e) =>
                    store.setNewsletterStyle({ tableHeaderBg: e.target.value })
                  }
                  className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                  aria-label="Pick table header background"
                  data-testid="picker-tableHeaderBg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                  onClick={() =>
                    store.setNewsletterStyle({ tableHeaderBg: null })
                  }
                  disabled={store.newsletterStyle.tableHeaderBg === null}
                  aria-label="Reset table header background to auto"
                  title="Auto uses email section background"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-1 ml-[98px]">
                {[
                  { color: store.emailPalette.sectionBg, label: 'Section' },
                  { color: store.emailPalette.footerBg, label: 'Footer' },
                  {
                    color: store.emailPalette.unsubscribeBg,
                    label: 'Subtle',
                  },
                  { color: store.emailPalette.bodyBg, label: 'Body' },
                ].map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    className={cn(
                      'h-4 w-4 rounded-sm border border-border cursor-pointer transition-transform hover:scale-125',
                      store.newsletterStyle.tableHeaderBg === sw.color &&
                        'ring-1 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: sw.color }}
                    onClick={() =>
                      store.setNewsletterStyle({ tableHeaderBg: sw.color })
                    }
                    title={`${sw.label} (${sw.color})`}
                    aria-label={`Set table header bg to ${sw.label}`}
                  />
                ))}
                <span className="text-[9px] text-muted-foreground ml-1">
                  email colors
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/30 p-1 max-h-[72px] overflow-y-auto">
        {/* Undo / Redo */}
        <ToolbarButton
          active={false}
          onClick={() => editor?.chain().focus().undo().run()}
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!editor?.can().undo()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => editor?.chain().focus().redo().run()}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={!editor?.can().redo()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Bold */}
        <ToolbarButton
          active={editor?.isActive('bold') || false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          label="Bold"
          shortcut="Ctrl+B"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          active={editor?.isActive('italic') || false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          label="Italic"
          shortcut="Ctrl+I"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          active={editor?.isActive('underline') || false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          label="Underline"
          shortcut="Ctrl+U"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Strikethrough */}
        <ToolbarButton
          active={editor?.isActive('strike') || false}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Font Size */}
        <Popover>
          <PopoverTrigger asChild>
            <ToolbarButton active={false} onClick={() => {}} label="Font size">
              <span className="text-[10px] font-semibold leading-none">
                {editor?.getAttributes('textStyle')?.fontSize
                  ? parseInt(editor.getAttributes('textStyle').fontSize)
                  : 14}
              </span>
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-24 p-1" side="bottom" align="start">
            <div className="flex flex-col gap-0.5">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={cn(
                    'rounded px-2 py-1 text-xs text-left hover:bg-accent transition-colors',
                    editor?.getAttributes('textStyle')?.fontSize ===
                      `${size}px` && 'bg-accent font-medium'
                  )}
                  onClick={() =>
                    (editor as any)
                      ?.chain()
                      .focus()
                      .setFontSize(`${size}px`)
                      .run()
                  }
                >
                  {size}px
                </button>
              ))}
              <hr className="my-0.5 border-border" />
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-left text-muted-foreground hover:bg-accent transition-colors"
                onClick={() =>
                  (editor as any)?.chain().focus().unsetFontSize().run()
                }
              >
                Default
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Formatting */}
        <ToolbarButton
          active={false}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
          label="Clear formatting"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Text Color */}
        <ColorInput
          label="Text color"
          color={lastTextColor}
          onChange={handleTextColor}
        >
          <Palette className="h-3.5 w-3.5" />
        </ColorInput>

        {/* Highlight */}
        <ColorInput
          label="Highlight"
          color={lastHighlightColor}
          onChange={handleHighlight}
        >
          <Highlighter className="h-3.5 w-3.5" />
        </ColorInput>

        <ToolbarSeparator />

        {/* H2 */}
        <ToolbarButton
          active={editor?.isActive('heading', { level: 2 }) || false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="Heading 2"
          shortcut="Ctrl+Alt+2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* H3 */}
        <ToolbarButton
          active={editor?.isActive('heading', { level: 3 }) || false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="Heading 3"
          shortcut="Ctrl+Alt+3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Bullet List */}
        <ToolbarButton
          active={editor?.isActive('bulletList') || false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          label="Bullet list"
          shortcut="Ctrl+Shift+8"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Numbered List */}
        <ToolbarButton
          active={editor?.isActive('orderedList') || false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
          shortcut="Ctrl+Shift+7"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Text Alignment (#3) */}
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'left' }) || false}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          label="Align left"
          shortcut="Ctrl+Shift+L"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'center' }) || false}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          label="Align center"
          shortcut="Ctrl+Shift+E"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'right' }) || false}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          label="Align right"
          shortcut="Ctrl+Shift+R"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'justify' }) || false}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          label="Justify"
          shortcut="Ctrl+Shift+J"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Blockquote (#5) */}
        <ToolbarButton
          active={editor?.isActive('blockquote') || false}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          label="Blockquote"
          shortcut="Ctrl+Shift+B"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Code Block (#4) */}
        <ToolbarButton
          active={editor?.isActive('codeBlock') || false}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          label="Code block"
          shortcut="Ctrl+Alt+C"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Link (popover-based) */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <ToolbarButton
              active={editor?.isActive('link') || false}
              onClick={handleLinkClick}
              label="Add link"
              shortcut="Ctrl+K"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="bottom" align="start">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Link URL
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  className="h-7 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLinkSubmit();
                    }
                  }}
                  data-testid="link-url-input"
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleLinkSubmit}
                  data-testid="link-submit-btn"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Remove Link */}
        {editor?.isActive('link') && (
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().unsetLink().run()}
            label="Remove link"
          >
            <Link2Off className="h-3.5 w-3.5" />
          </ToolbarButton>
        )}

        {/* Open Link in New Tab */}
        {editor?.isActive('link') && (
          <ToolbarButton
            active={false}
            onClick={() => {
              const href = editor?.getAttributes('link').href;
              if (href) window.open(href, '_blank', 'noopener,noreferrer');
            }}
            label="Open link"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </ToolbarButton>
        )}

        <ToolbarSeparator />

        {/* Image (#1) — popover for URL + hidden file input for upload */}
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <ToolbarButton
              active={editor?.isActive('image') || false}
              onClick={() => setImagePopoverOpen(true)}
              label="Insert image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="bottom" align="start">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Image URL
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://"
                  className="h-7 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleImageFromUrl();
                    }
                  }}
                  data-testid="image-url-input"
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleImageFromUrl}
                  data-testid="image-submit-btn"
                >
                  Apply
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-xs text-muted-foreground">Or</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => imageFileInputRef.current?.click()}
                  data-testid="image-upload-btn"
                >
                  Upload file
                </Button>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarSeparator />

        {/* Table (#2) */}
        <Popover>
          <PopoverTrigger asChild>
            <ToolbarButton
              active={editor?.isActive('table') || false}
              onClick={() => {}}
              label="Table"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" side="bottom" align="start">
            <div className="flex flex-col gap-0.5">
              {/* Grid Size Picker */}
              <div className="px-2 py-1">
                <p className="text-[10px] text-muted-foreground mb-1 text-center">
                  {tableGridHover.rows > 0
                    ? `${tableGridHover.rows} × ${tableGridHover.cols}`
                    : 'Select table size'}
                </p>
                <div
                  className="grid gap-0.5 mx-auto w-fit"
                  style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
                  onMouseLeave={() => setTableGridHover({ rows: 0, cols: 0 })}
                >
                  {Array.from({ length: 6 }, (_, r) =>
                    Array.from({ length: 6 }, (_, c) => {
                      const row = r + 1;
                      const col = c + 1;
                      const isHighlighted =
                        row <= tableGridHover.rows &&
                        col <= tableGridHover.cols;
                      return (
                        <button
                          key={`${row}-${col}`}
                          type="button"
                          className={cn(
                            'h-4 w-4 border rounded-[2px] transition-colors',
                            isHighlighted
                              ? 'bg-primary border-primary'
                              : 'bg-muted border-border hover:border-primary/50'
                          )}
                          onMouseEnter={() =>
                            setTableGridHover({ rows: row, cols: col })
                          }
                          onClick={() => {
                            insertTable(row, col);
                            setTableGridHover({ rows: 0, cols: 0 });
                          }}
                          aria-label={`Insert ${row}×${col} table`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
              <div className="h-px bg-border my-0.5" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
                disabled={!editor?.can().addColumnBefore()}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add column before
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                disabled={!editor?.can().addColumnAfter()}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add column after
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                disabled={!editor?.can().deleteColumn()}
              >
                <Minus className="h-3 w-3 mr-1.5" />
                Delete column
              </Button>
              <div className="h-px bg-border my-0.5" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().addRowBefore().run()}
                disabled={!editor?.can().addRowBefore()}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add row before
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                disabled={!editor?.can().addRowAfter()}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add row after
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().deleteRow().run()}
                disabled={!editor?.can().deleteRow()}
              >
                <Minus className="h-3 w-3 mr-1.5" />
                Delete row
              </Button>
              <div className="h-px bg-border my-0.5" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().mergeCells().run()}
                disabled={!editor?.can().mergeCells()}
              >
                <TableCellsMerge className="h-3 w-3 mr-1.5" />
                Merge cells
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs"
                onClick={() => editor?.chain().focus().splitCell().run()}
                disabled={!editor?.can().splitCell()}
              >
                <TableCellsSplit className="h-3 w-3 mr-1.5" />
                Split cell
              </Button>
              <div className="h-px bg-border my-0.5" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => editor?.chain().focus().deleteTable().run()}
                disabled={!editor?.can().deleteTable()}
              >
                <Trash2Icon className="h-3 w-3 mr-1.5" />
                Delete table
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarSeparator />

        {/* Horizontal Rule / Dividers */}
        <Popover>
          <PopoverTrigger asChild>
            <ToolbarButton
              active={false}
              onClick={() => {}}
              label="Insert divider"
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" side="bottom" align="start">
            {(() => {
              const dividerColor =
                store.newsletterStyle.tableBorderColor ??
                store.emailPalette.text;
              return (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContent(
                          `<hr style="border: none; border-top: 1px solid ${dividerColor};" />`
                        )
                        .run();
                    }}
                  >
                    <hr
                      className="flex-1 border-t"
                      style={{ borderColor: dividerColor }}
                    />
                    <span className="text-muted-foreground shrink-0">
                      Solid
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContent(
                          `<hr style="border: none; border-top: 1px dashed ${dividerColor};" />`
                        )
                        .run();
                    }}
                  >
                    <hr
                      className="flex-1 border-t border-dashed"
                      style={{ borderColor: dividerColor }}
                    />
                    <span className="text-muted-foreground shrink-0">
                      Dashed
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContent(
                          `<hr style="border: none; border-top: 1px dotted ${dividerColor};" />`
                        )
                        .run();
                    }}
                  >
                    <hr
                      className="flex-1 border-t border-dotted"
                      style={{ borderColor: dividerColor }}
                    />
                    <span className="text-muted-foreground shrink-0">
                      Dotted
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContent(
                          `<hr style="border: none; border-top: 3px solid ${dividerColor};" />`
                        )
                        .run();
                    }}
                  >
                    <hr
                      className="flex-1 border-t-[3px]"
                      style={{ borderColor: dividerColor }}
                    />
                    <span className="text-muted-foreground shrink-0">
                      Thick
                    </span>
                  </button>
                </div>
              );
            })()}
          </PopoverContent>
        </Popover>

        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <ToolbarButton
              active={false}
              onClick={() => {}}
              label="Insert emoji"
            >
              <Smile className="h-3.5 w-3.5" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" side="bottom" align="start">
            <div className="grid grid-cols-8 gap-0.5 max-h-[200px] overflow-y-auto">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-base cursor-pointer"
                  onClick={() => {
                    editor?.chain().focus().insertContent(emoji).run();
                  }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Heading Alignment (store-level) */}
        <ToolbarButton
          active={store.newsletterStyle.headingAlign === 'left'}
          onClick={() => store.setNewsletterStyle({ headingAlign: 'left' })}
          label="Align heading left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={store.newsletterStyle.headingAlign === 'center'}
          onClick={() => store.setNewsletterStyle({ headingAlign: 'center' })}
          label="Align heading center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content Area */}
      <div className="rounded-md border bg-transparent dark:bg-input/30 min-h-[200px] overflow-hidden">
        <EditorContent
          editor={editor}
          className={cn(
            'newsletter-editor prose prose-sm max-w-none px-3 py-2 min-h-[200px] focus:outline-none [&>.tiptap]:min-h-[200px] [&>.tiptap]:outline-none',
            store.newsletterStyle.headingAlign === 'center'
              ? '[&_h2]:text-center'
              : '[&_h2]:text-left'
          )}
        />
      </div>

      {/* Find & Replace Bar (#6) */}
      {findReplaceOpen && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2"
          data-testid="find-replace-bar"
        >
          <div className="flex items-center gap-1 flex-1 min-w-[200px]">
            <Input
              ref={findInputRef}
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
              }}
              placeholder="Find..."
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  performFind();
                }
              }}
              data-testid="find-input"
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 shrink-0',
                findCaseSensitive && 'bg-accent text-accent-foreground'
              )}
              onClick={() => setFindCaseSensitive(!findCaseSensitive)}
              title="Match case"
              aria-label="Match case"
              aria-pressed={findCaseSensitive}
              data-testid="find-case-sensitive"
            >
              <ALargeSmall className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 shrink-0',
                findWholeWord && 'bg-accent text-accent-foreground'
              )}
              onClick={() => setFindWholeWord(!findWholeWord)}
              title="Whole word"
              aria-label="Whole word"
              aria-pressed={findWholeWord}
              data-testid="find-whole-word"
            >
              <SpellCheck className="h-3 w-3" />
            </Button>
            {findCount > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {findCount} found
              </span>
            )}
          </div>
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace..."
            className="h-7 text-xs w-32"
            data-testid="replace-input"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={performReplace}
            disabled={!findText}
            data-testid="replace-btn"
          >
            Replace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={performReplaceAll}
            disabled={!findText}
            data-testid="replace-all-btn"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setFindReplaceOpen(false);
              setFindText('');
              setReplaceText('');
              setFindCount(0);
            }}
            aria-label="Close find & replace"
            data-testid="find-replace-close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Word/Character Count, Read Time, & Reset */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span
          data-testid="newsletter-word-count"
          className="flex items-center gap-1.5"
        >
          <span
            className={cn(
              wordCount > WORD_DANGER
                ? 'text-destructive font-medium'
                : wordCount > WORD_WARNING
                  ? 'text-orange-500'
                  : ''
            )}
          >
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          &middot; {charCount} char{charCount !== 1 ? 's' : ''}
          {wordCount > 0 && (
            <>
              &middot;
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {readTimeMin} min read
              </span>
            </>
          )}
          {wordCount > WORD_WARNING && (
            <span
              className={cn(
                'text-[10px] ml-1',
                wordCount > WORD_DANGER ? 'text-destructive' : 'text-orange-500'
              )}
            >
              {wordCount > WORD_DANGER
                ? '(very long for email)'
                : '(getting long)'}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => {
              setFindReplaceOpen(!findReplaceOpen);
              if (!findReplaceOpen) {
                setTimeout(() => findInputRef.current?.focus(), 50);
              }
            }}
            aria-label="Find & replace"
            data-testid="find-replace-toggle"
          >
            <Search className="h-3 w-3" />
            Find
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleResetNewsletter}
            aria-label="Reset newsletter"
            data-testid="newsletter-reset-btn"
          >
            <Trash2 className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
