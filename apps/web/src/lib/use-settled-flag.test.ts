import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettledFlag } from './use-settled-flag';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSettledFlag', () => {
  it('starts false and stays false while the flag is false', () => {
    const { result } = renderHook(() => useSettledFlag(false, 1000));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(false);
  });

  it('turns true only after the flag has held for the delay', () => {
    const { result, rerender } = renderHook(({ flag }) => useSettledFlag(flag, 1000), {
      initialProps: { flag: true },
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    rerender({ flag: false });
    expect(result.current).toBe(false);
  });

  it('ignores a blip that resolves before the delay elapses', () => {
    const { result, rerender } = renderHook(({ flag }) => useSettledFlag(flag, 1000), {
      initialProps: { flag: true },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ flag: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(false);
  });
});
