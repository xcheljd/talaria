import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ClearableTextarea } from '@/components/ui/clearable-textarea';

function Harness({ singleLine }: { singleLine?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <>
      <ClearableTextarea
        aria-label="field"
        value={value}
        onChange={setValue}
        singleLine={singleLine}
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('ClearableTextarea', () => {
  it('blocks Enter when singleLine', async () => {
    const user = userEvent.setup();
    render(<Harness singleLine />);
    await user.type(screen.getByLabelText('field'), 'Sundrift{Enter}10% off');
    expect(screen.getByTestId('value').textContent).toBe('Sundrift10% off');
  });

  it('turns pasted line breaks into spaces when singleLine', async () => {
    const user = userEvent.setup();
    render(<Harness singleLine />);
    await user.click(screen.getByLabelText('field'));
    await user.paste('MV-2110-GLD\nSundrift\r\n$265');
    expect(screen.getByTestId('value').textContent).toBe(
      'MV-2110-GLD Sundrift $265'
    );
  });

  it('keeps line breaks by default', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('field'), 'a{Enter}b');
    expect(screen.getByTestId('value').textContent).toBe('a\nb');
  });

  it('clears the value with the X button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('field'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Clear field' }));
    expect(screen.getByTestId('value').textContent).toBe('');
  });
});
