import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton.tsx';

describe('CopyButton', () => {
  it('copies the text and shows "Copied"', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="https://pay.example.com/l/abc" itemName="Logo design" />);

    await user.click(screen.getByRole('button', { name: 'Copy link: Logo design' }));

    expect(await navigator.clipboard.readText()).toBe('https://pay.example.com/l/abc');
    expect(screen.getByRole('button', { name: 'Copied: Logo design' })).toBeInTheDocument();
    expect(screen.getByText('Link copied for Logo design')).toBeInTheDocument();
  });

  it('says so when the browser blocks copying', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Blocked'));
    render(<CopyButton text="https://pay.example.com/l/abc" itemName="Logo design" />);

    await user.click(screen.getByRole('button', { name: 'Copy link: Logo design' }));

    expect(screen.getByRole('button', { name: "Couldn't copy: Logo design" })).toBeInTheDocument();
  });

  it('goes back to "Copy link" after two seconds', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="x" itemName="Logo design" />);

    await user.click(screen.getByRole('button', { name: 'Copy link: Logo design' }));
    expect(screen.getByRole('button', { name: 'Copied: Logo design' })).toBeInTheDocument();

    expect(
      await screen.findByRole('button', { name: 'Copy link: Logo design' }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
