/**
 * NewsletterToolbar — the rich-text formatting toolbar for the newsletter
 * editor: text formatting, font size, color/highlight, headings, lists,
 * alignment, blockquote/code, link/image/table/divider/emoji popovers, and the
 * heading-alignment toggle. Extracted from NewsletterEditor; all of its popover
 * and color state is toolbar-local, so it takes only the editor instance and
 * reads the store directly for heading alignment.
 */

import { useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useShallow } from 'zustand/react/shallow';
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Strikethrough,
  ExternalLink,
  ImageIcon,
  Table as TableIcon,
  Plus,
  TableCellsMerge,
  TableCellsSplit,
  Trash2Icon,
  Code,
  Quote,
  Smile,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeURL } from '@/lib/html-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { usePromotionStore } from '@/stores/promotion-store';
import { useNewsletterStore } from '@/stores/newsletter-store';
import { compressImage } from './image-utils';
import { EMOJI_LIST } from './emoji-data';
import { FONT_SIZES } from './extensions';
import { ToolbarButton, ToolbarSeparator, ColorInput } from './toolbar';

export function NewsletterToolbar({ editor }: { editor: Editor | null }) {
  // Newsletter-domain fields (newsletterStyle + its setter, used for heading
  // alignment) read from the newsletter store (plan 022). emailPalette is the
  // palette domain and stays on the main store.
  const { newsletterStyle, setNewsletterStyle } = useNewsletterStore(
    useShallow((s) => ({
      newsletterStyle: s.newsletterStyle,
      setNewsletterStyle: s.setNewsletterStyle,
    }))
  );
  const emailPalette = usePromotionStore((s) => s.emailPalette);
  const store = { newsletterStyle, setNewsletterStyle, emailPalette };

  // Track last-used colors for color pickers (#11)
  const [lastTextColor, setLastTextColor] = useState('#000000');
  const [lastHighlightColor, setLastHighlightColor] = useState('#fef08a');

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

  return (
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
                      row <= tableGridHover.rows && col <= tableGridHover.cols;
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
              store.newsletterStyle.tableBorderColor ?? store.emailPalette.text;
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
                  <span className="text-muted-foreground shrink-0">Solid</span>
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
                  <span className="text-muted-foreground shrink-0">Dashed</span>
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
                  <span className="text-muted-foreground shrink-0">Dotted</span>
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
                  <span className="text-muted-foreground shrink-0">Thick</span>
                </button>
              </div>
            );
          })()}
        </PopoverContent>
      </Popover>

      {/* Emoji Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarButton active={false} onClick={() => {}} label="Insert emoji">
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
  );
}
