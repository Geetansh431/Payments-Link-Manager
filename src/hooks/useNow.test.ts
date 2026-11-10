import { act, renderHook } from '@testing-library/react';
import { DEFAULT_TICK_MS, useNow } from './useNow.ts';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('starts at the current time', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current.toISOString()).toBe('2026-11-10T12:00:00.000Z');
  });

  it('updates every 30 seconds by default', () => {
    const { result } = renderHook(() => useNow());

    act(() => vi.advanceTimersByTime(DEFAULT_TICK_MS - 1));
    expect(result.current.toISOString()).toBe('2026-11-10T12:00:00.000Z');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toISOString()).toBe('2026-11-10T12:00:30.000Z');
  });

  it('stops the timer when the component unmounts', () => {
    const { unmount } = renderHook(() => useNow(1000));
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
