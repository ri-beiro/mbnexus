import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "@/features/notes/useAutosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("starts as saved, with nothing pending", () => {
    const { result } = renderHook(() => useAutosave("initial", vi.fn().mockResolvedValue(undefined)));
    expect(result.current.status).toBe("saved");
  });

  it("flips to unsaved as soon as the value changes", () => {
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, vi.fn().mockResolvedValue(undefined)), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "changed" });

    expect(result.current.status).toBe("unsaved");
  });

  it("saves after the debounce delay and reports saved once it resolves", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, save, 800), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "changed" });
    expect(save).not.toHaveBeenCalled();

    // advanceTimersByTimeAsync (rather than the sync variant + RTL's
    // waitFor, which polls with real timers and hangs forever once fake
    // timers are active) flushes the microtasks from save()'s promise
    // resolution in between timer advances, so the state update lands
    // within this same act() call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(save).toHaveBeenCalledWith("changed");
    expect(result.current.status).toBe("saved");
  });

  it("debounces rapid successive changes into a single save of the latest value", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ value }) => useAutosave(value, save, 800), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    rerender({ value: "abc" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
  });

  it("reports unsaved again if the save fails, instead of falsely claiming saved", async () => {
    const save = vi.fn().mockRejectedValue(new Error("network down"));
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, save, 800), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "changed" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.status).toBe("unsaved");
  });
});
