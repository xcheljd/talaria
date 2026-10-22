/**
 * NewsletterTableMenu — contextual table toolbar wiring: each button runs
 * the matching TipTap table command against a real editor.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NewsletterTableMenu } from '@/components/promotion/newsletter/NewsletterTableMenu';

let editor: Editor | null = null;

function setup() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  editor = new Editor({
    element: host,
    extensions: [StarterKit, Table, TableRow, TableCell, TableHeader],
    content:
      '<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr>' +
      '<tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>',
  });
  // Caret inside the first body cell ("1").
  let pos = 0;
  editor.state.doc.descendants((node, p) => {
    if (!pos && node.isText && node.text === '1') pos = p;
  });
  editor.commands.setTextSelection(pos);
  render(
    <TooltipProvider>
      <NewsletterTableMenu editor={editor} />
    </TooltipProvider>
  );
  return editor;
}

const dims = (e: Editor) => {
  const t = e.view.dom.querySelector('table')!;
  return [t.rows.length, t.rows[0].cells.length];
};

afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = null;
});

describe('NewsletterTableMenu', () => {
  it('adds and deletes rows and columns', () => {
    const e = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add row below' }));
    expect(dims(e)).toEqual([3, 2]);
    fireEvent.click(screen.getByRole('button', { name: 'Add column right' }));
    expect(dims(e)).toEqual([3, 3]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete column' }));
    expect(dims(e)).toEqual([3, 2]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete row' }));
    expect(dims(e)).toEqual([2, 2]);
  });

  it('toggles the header row', () => {
    const e = setup();
    expect(e.view.dom.querySelectorAll('th')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle header row' }));
    expect(e.view.dom.querySelectorAll('th')).toHaveLength(0);
  });

  it('deletes the whole table', () => {
    const e = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete table' }));
    expect(e.view.dom.querySelector('table')).toBeNull();
  });
});
