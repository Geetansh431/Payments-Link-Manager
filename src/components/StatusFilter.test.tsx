import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusFilter } from './StatusFilter.tsx';

const counts = { All: 4, Active: 2, Paid: 1, Expired: 1 };

describe('StatusFilter', () => {
  it('shows each filter with its count and marks the selected one as pressed', () => {
    render(<StatusFilter value="Paid" counts={counts} onChange={() => {}} />);

    expect(screen.getByRole('group', { name: 'Filter by status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (4)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Paid (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('can be used with the keyboard alone', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusFilter value="All" counts={counts} onChange={onChange} />);

    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('Active');
  });
});
