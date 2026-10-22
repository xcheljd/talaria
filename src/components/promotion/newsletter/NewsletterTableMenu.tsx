/**
 * NewsletterTableMenu — contextual toolbar that floats above a table while
 * the cursor is inside it: add/remove rows and columns, toggle the header
 * row, merge/split cells, delete the table. Keeps table editing next to the
 * table instead of in the main toolbar's Table popover.
 */

import { useEffect, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { CellSelection } from '@tiptap/pm/tables';
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
} from 'lucide-react';
import { ToolbarButton, ToolbarSeparator } from './toolbar';
import { getScrollBoundary } from './NewsletterBubbleMenu';

export function NewsletterTableMenu({ editor }: { editor: Editor | null }) {
  const [boundary, setBoundary] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    if (editor) setBoundary(getScrollBoundary(editor.view.dom));
  }, [editor]);

  if (!editor) return null;

  // Anchor the menu to the whole table, not the caret, so it doesn't jump
  // around while moving between cells.
  const getTableRect = () => {
    const { from } = editor.state.selection;
    const dom = editor.view.domAtPos(from).node;
    const el = dom.nodeType === 1 ? (dom as Element) : dom.parentElement;
    const table = el?.closest('table');
    return (table ?? editor.view.dom).getBoundingClientRect();
  };

  const run = (
    fn: (c: ReturnType<Editor['chain']>) => { run: () => boolean }
  ) => fn(editor.chain().focus()).run();

  return (
    <BubbleMenu
      key={boundary ? 'bounded' : 'unbounded'}
      pluginKey="newsletterTableMenu"
      editor={editor}
      // Collapsed caret or cell selection inside a table; the text bubble
      // menu owns real text selections.
      shouldShow={({ editor, from, to, state }) =>
        editor.isEditable &&
        editor.isActive('table') &&
        (from === to || state.selection instanceof CellSelection)
      }
      getReferencedVirtualElement={() => ({
        getBoundingClientRect: getTableRect,
        getClientRects: () => [getTableRect()],
      })}
      appendTo={() => document.body}
      options={{
        placement: 'top',
        offset: 8,
        strategy: 'fixed',
        flip: true,
        shift: { boundary, padding: 8 },
      }}
      className="z-50 flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
      data-testid="table-menu"
    >
      <ToolbarButton
        active={false}
        label="Add row above"
        onClick={() => run((c) => c.addRowBefore())}
      >
        <BetweenHorizontalStart className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Add row below"
        onClick={() => run((c) => c.addRowAfter())}
      >
        <BetweenHorizontalEnd className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Delete row"
        onClick={() => run((c) => c.deleteRow())}
      >
        <TableRowsSplit className="size-3.5" />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton
        active={false}
        label="Add column left"
        onClick={() => run((c) => c.addColumnBefore())}
      >
        <BetweenVerticalStart className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Add column right"
        onClick={() => run((c) => c.addColumnAfter())}
      >
        <BetweenVerticalEnd className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Delete column"
        onClick={() => run((c) => c.deleteColumn())}
      >
        <TableColumnsSplit className="size-3.5" />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton
        active={false}
        label="Toggle header row"
        onClick={() => run((c) => c.toggleHeaderRow())}
      >
        <PanelTop className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Merge cells"
        disabled={!editor.can().mergeCells()}
        onClick={() => run((c) => c.mergeCells())}
      >
        <TableCellsMerge className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        label="Split cell"
        disabled={!editor.can().splitCell()}
        onClick={() => run((c) => c.splitCell())}
      >
        <TableCellsSplit className="size-3.5" />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton
        active={false}
        label="Delete table"
        className="text-destructive hover:text-destructive"
        onClick={() => run((c) => c.deleteTable())}
      >
        <Trash2 className="size-3.5" />
      </ToolbarButton>
    </BubbleMenu>
  );
}
