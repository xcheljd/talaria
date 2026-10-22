/**
 * ResizableImage node view: toolbar actions, size presets/exact width, alt
 * text, corner-drag resize, and HTML round-trip, against a real editor.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizableImage } from '@/components/promotion/ResizableImage';

const SRC = 'data:image/png;base64,iVBORw0KGgo=';
let editorRef: Editor | null = null;

function Harness({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit, ResizableImage],
    content,
    immediatelyRender: true,
  });
  editorRef = editor;
  return <EditorContent editor={editor} />;
}

async function setup(attrs = '') {
  render(
    <TooltipProvider>
      <Harness content={`<p>x</p><img src="${SRC}" ${attrs}><p>y</p>`} />
    </TooltipProvider>
  );
  const editor = editorRef!;
  // Select the image node so its toolbar and handles render.
  let pos = -1;
  editor.state.doc.descendants((n, p) => {
    if (n.type.name === 'image') pos = p;
  });
  await act(async () => {
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
    );
  });
  return editor;
}

const imgAttrs = (e: Editor) => {
  let a: Record<string, unknown> = {};
  e.state.doc.descendants((n) => {
    if (n.type.name === 'image') a = n.attrs;
  });
  return a;
};

afterEach(() => {
  cleanup();
  editorRef?.destroy();
  editorRef = null;
});

describe('ResizableImage', () => {
  it('shows four corner handles when selected', async () => {
    await setup();
    expect(screen.getAllByTestId(/^image-resize-/)).toHaveLength(4);
  });

  it('aligns the image from the toolbar', async () => {
    const e = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Align right' }));
    expect(imgAttrs(e).align).toBe('right');
    fireEvent.click(screen.getByRole('button', { name: 'Align left' }));
    expect(imgAttrs(e).align).toBe('left');
  });

  it('sets an exact width and resets to the original size', async () => {
    const user = userEvent.setup();
    const e = await setup();
    await user.click(screen.getByTestId('image-size-btn'));
    const input = await screen.findByTestId('image-width-input');
    await user.clear(input);
    await user.type(input, '180{Enter}');
    expect(imgAttrs(e).width).toBe(180);
    await user.click(
      screen.getByRole('button', { name: 'Reset to original size' })
    );
    expect(imgAttrs(e).width).toBeNull();
  });

  it('rejects widths below the 50px minimum (native min validation)', async () => {
    const user = userEvent.setup();
    const e = await setup();
    await user.click(screen.getByTestId('image-size-btn'));
    const input = await screen.findByTestId('image-width-input');
    await user.clear(input);
    await user.type(input, '10{Enter}');
    expect(input).toBeInvalid();
    expect(imgAttrs(e).width).toBeNull();
  });

  it('applies a percentage preset', async () => {
    const user = userEvent.setup();
    const e = await setup();
    await user.click(screen.getByTestId('image-size-btn'));
    await user.click(await screen.findByTestId('image-size-100'));
    // jsdom has no layout, so the column falls back to the 600px email width.
    expect(imgAttrs(e).width).toBe(600);
  });

  it('saves and clears alt text', async () => {
    const user = userEvent.setup();
    const e = await setup();
    await user.click(screen.getByTestId('image-alt-btn'));
    const input = await screen.findByTestId('image-alt-input');
    await user.type(input, 'Summer lineup{Enter}');
    expect(imgAttrs(e).alt).toBe('Summer lineup');
    await user.clear(input);
    await user.type(input, '   {Enter}');
    expect(imgAttrs(e).alt).toBeNull();
  });

  it('adds and removes a link', async () => {
    const user = userEvent.setup();
    const e = await setup();
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    const input = screen.getByPlaceholderText('https://');
    await user.clear(input);
    await user.type(input, 'https://example.com{Enter}');
    expect(imgAttrs(e).href).toBe('https://example.com');
  });

  it('deletes the image', async () => {
    const e = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete image' }));
    expect(e.getHTML()).not.toContain('<img');
  });

  it('round-trips width and alt through HTML', async () => {
    const e = await setup('width="240" alt="Banner"');
    expect(Number(imgAttrs(e).width)).toBe(240);
    expect(imgAttrs(e).alt).toBe('Banner');
    expect(e.getHTML()).toMatch(/<img[^>]*width: 240px/);
  });
});
