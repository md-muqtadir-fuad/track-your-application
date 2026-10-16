import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the sidebar navigation items', () => {
    render(<App />);
    expect(screen.getByText('Track Your PhD')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(nav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(nav).getByText('Applications')).toBeInTheDocument();
    expect(within(nav).getByText('Recommenders')).toBeInTheDocument();
    expect(within(nav).getByText('Faculty')).toBeInTheDocument();
    expect(within(nav).getByText('Calendar')).toBeInTheDocument();
    expect(within(nav).getByText('Documents & scores')).toBeInTheDocument();
    expect(within(nav).getByText('Offers')).toBeInTheDocument();
    expect(within(nav).getByText('Settings')).toBeInTheDocument();
  });
});
