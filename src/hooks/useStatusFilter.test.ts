import { act, renderHook } from '@testing-library/react';
import { readFilterFromUrl, useStatusFilter } from './useStatusFilter.ts';

/** Sets the page URL's query string, e.g. `?status=Paid`. */
function setSearch(search: string) {
  window.history.replaceState(null, '', `/${search}`);
}

describe('useStatusFilter', () => {
  afterEach(() => setSearch(''));

  it.each([
    ['', 'All'],
    ['?status=Paid', 'Paid'],
    ['?status=Expired', 'Expired'],
    ['?status=paid', 'All'],
    ['?status=Cancelled', 'All'],
  ])('reads %j from the URL as %s', (search, expected) => {
    setSearch(search);
    expect(readFilterFromUrl()).toBe(expected);
    expect(renderHook(() => useStatusFilter()).result.current[0]).toBe(expected);
  });

  it('writes the selected filter to the URL and keeps other parameters', () => {
    setSearch('?mock=fail-create');
    const { result } = renderHook(() => useStatusFilter());

    act(() => result.current[1]('Active'));

    expect(result.current[0]).toBe('Active');
    expect(window.location.search).toBe('?mock=fail-create&status=Active');
  });

  it('removes the status from the URL when All is selected', () => {
    setSearch('?status=Paid');
    const { result } = renderHook(() => useStatusFilter());

    act(() => result.current[1]('All'));

    expect(result.current[0]).toBe('All');
    expect(window.location.search).toBe('');
  });
});
