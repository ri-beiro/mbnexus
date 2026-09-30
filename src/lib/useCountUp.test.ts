import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "@/lib/useCountUp";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at 0 and animates up to the target value", () => {
    const { result } = renderHook(() => useCountUp(80, 400));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(80);
  });

  it("is partway between 0 and the target midway through the duration", () => {
    const { result } = renderHook(() => useCountUp(100, 1000));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it("jumps straight to 0 for a target of 0", () => {
    const { result } = renderHook(() => useCountUp(0, 400));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(0);
  });
});
