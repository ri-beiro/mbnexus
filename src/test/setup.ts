import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; Recharts' <ResponsiveContainer> needs one to
// avoid a console error (it still renders its children synchronously
// without it, so tests don't need it to *do* anything, just exist).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
