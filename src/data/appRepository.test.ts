import {
  DEFAULT_LATENCY_MS,
  SLOW_LATENCY_MS,
  createAppRepository,
  readMockOptions,
} from './appRepository.ts';
import { DATA_ERRORS } from './repository.ts';
import { STORAGE_KEY } from './storage.ts';

describe('readMockOptions', () => {
  it('is all off without a mock parameter', () => {
    expect(readMockOptions('')).toEqual({
      slow: false,
      failLoad: false,
      failCreate: false,
      reset: false,
    });
  });

  it('reads several comma-separated switches', () => {
    expect(readMockOptions('?status=Paid&mock=reset,fail-create')).toEqual({
      slow: false,
      failLoad: false,
      failCreate: true,
      reset: true,
    });
  });

  it('ignores unknown switches', () => {
    expect(readMockOptions('?mock=explode')).toMatchObject({ slow: false, reset: false });
  });
});

describe('createAppRepository', () => {
  it('clears saved links and starts from the sample data with ?mock=reset', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    vi.useFakeTimers();
    const listed = createAppRepository('?mock=reset', localStorage).list();
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(await listed).toHaveLength(4);
  });

  it('uses the long delay with ?mock=slow', async () => {
    vi.useFakeTimers();
    let done = false;
    void createAppRepository('?mock=slow', null)
      .list()
      .then(() => (done = true));

    await vi.advanceTimersByTimeAsync(DEFAULT_LATENCY_MS);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(SLOW_LATENCY_MS - DEFAULT_LATENCY_MS);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it('uses the browser storage by default', async () => {
    vi.useFakeTimers();
    void createAppRepository('');
    vi.useRealTimers();

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('passes the failure switches through', async () => {
    vi.useFakeTimers();
    const listed = createAppRepository('?mock=fail-load', localStorage).list();
    const assertion = expect(listed).rejects.toThrow(DATA_ERRORS.load);
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });
});
