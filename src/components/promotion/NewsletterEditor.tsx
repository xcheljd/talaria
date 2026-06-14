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

import { useCallback, useEffect, useRef, useState } from 'react';
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
  ArrowUpFromLine,
  ArrowDownFromLine,
  Trash2,
  Search,
  X,
  ALargeSmall,
  SpellCheck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  type NewsletterPosition,
} from '@/stores/promotion-store';

import {
  FontSize,
  SanitizePasteExtension,
  DragHandleExtension,
  DropImageExtension,
  lowlight,
} from './newsletter/extensions';
import { NewsletterStylePanel } from './newsletter/NewsletterStylePanel';
import { NewsletterToolbar } from './newsletter/NewsletterToolbar';

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

      <NewsletterStylePanel />

      {/* Formatting Toolbar */}
      <NewsletterToolbar editor={editor} />

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
