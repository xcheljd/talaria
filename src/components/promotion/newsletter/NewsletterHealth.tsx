/**
 * The newsletter editor's footer status: read time, an approximate length in
 * phone screens, and live warnings (images without alt text, links without an
 * address) that select the problem in the editor when clicked.
 */
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { AlertTriangle, Clock, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Roughly how much fits on one phone screen of email body text. */
const WORDS_PER_SCREEN = 120;
/** An inline image takes about half a phone screen. */
const SCREENS_PER_IMAGE = 0.5;

export interface NewsletterHealthReport {
  words: number;
  chars: number;
  readMinutes: number;
  /** Approximate phone screens, rounded to halves. */
  screens: number;
  /** Doc positions of images with no alt text. */
  missingAlt: number[];
  /** Doc positions of links with no usable address. */
  emptyLinks: number[];
}

const isEmptyHref = (href: unknown) => {
  const h = typeof href === 'string' ? href.trim() : '';
  return h === '' || h === '#' || /^https?:\/\/?$/i.test(h);
};

/** Measure the editor's current document (pure; exported for tests). */
export function measureNewsletter(editor: Editor): NewsletterHealthReport {
  const text = editor.getText();
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  let images = 0;
  const missingAlt: number[] = [];
  const emptyLinks: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') {
      images++;
      if (!String(node.attrs.alt ?? '').trim()) missingAlt.push(pos);
    }
    if (node.isText) {
      const link = node.marks.find((m) => m.type.name === 'link');
      if (link && isEmptyHref(link.attrs.href)) {
        // Count each link once: only where it starts.
        const before =
          pos > 0 ? editor.state.doc.resolve(pos).nodeBefore : null;
        const continues = before?.marks.some(
          (m) => m.type.name === 'link' && m.attrs.href === link.attrs.href
        );
        if (!continues) emptyLinks.push(pos);
      }
    }
    return true;
  });
  const rawScreens = words / WORDS_PER_SCREEN + images * SCREENS_PER_IMAGE;
  return {
    words,
    chars: text.length,
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    screens: Math.max(0.5, Math.round(rawScreens * 2) / 2),
    missingAlt,
    emptyLinks,
  };
}

function screensLabel(screens: number): string {
  if (screens <= 0.5) return 'under one phone screen';
  if (screens === 1) return 'about one phone screen';
  return `about ${screens} phone screens`;
}

export function NewsletterHealth({ editor }: { editor: Editor | null }) {
  // Re-measure on every transaction (typing, loading a set, Undo).
  const report = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? measureNewsletter(e) : null),
  });
  if (!editor || !report) return null;

  const jumpTo = (positions: number[], kind: 'node' | 'text') => {
    const pos = positions[0];
    if (pos === undefined) return;
    const chain = editor.chain().focus();
    if (kind === 'node') chain.setNodeSelection(pos).scrollIntoView().run();
    else
      chain
        .setTextSelection(pos + 1)
        .extendMarkRange('link')
        .scrollIntoView()
        .run();
  };

  const long = report.screens > 3;
  const warn = (count: number, one: string, many: string) =>
    count === 1 ? one : `${count} ${many}`;

  return (
    <span
      data-testid="newsletter-word-count"
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
    >
      <span>
        {report.words} word{report.words !== 1 ? 's' : ''}
      </span>
      <span aria-hidden="true">&middot;</span>
      <span>
        {report.chars} char{report.chars !== 1 ? 's' : ''}
      </span>
      {report.words > 0 && (
        <>
          <span aria-hidden="true">&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />~{report.readMinutes}{' '}
            min read
          </span>
          <span aria-hidden="true">&middot;</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={
                  long
                    ? 'inline-flex items-center gap-1 text-warning'
                    : 'inline-flex items-center gap-1'
                }
                data-testid="newsletter-screens"
                tabIndex={0}
              >
                <Smartphone className="size-3" aria-hidden="true" />
                {screensLabel(report.screens)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Estimate from words and images. Newsletters that fit one or two
              phone screens get read; past three, most readers skim.
            </TooltipContent>
          </Tooltip>
        </>
      )}
      {report.missingAlt.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          className="h-5 px-1.5 text-warning hover:text-warning"
          onClick={() => jumpTo(report.missingAlt, 'node')}
          data-testid="newsletter-warn-alt"
        >
          <AlertTriangle aria-hidden="true" />
          {warn(
            report.missingAlt.length,
            '1 image missing alt text',
            'images missing alt text'
          )}
        </Button>
      )}
      {report.emptyLinks.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          className="h-5 px-1.5 text-warning hover:text-warning"
          onClick={() => jumpTo(report.emptyLinks, 'text')}
          data-testid="newsletter-warn-link"
        >
          <AlertTriangle aria-hidden="true" />
          {warn(
            report.emptyLinks.length,
            '1 link has no address',
            'links have no address'
          )}
        </Button>
      )}
    </span>
  );
}
