import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';

describe('App shell', () => {
  it('renders the page heading and main landmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Payment Links' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
