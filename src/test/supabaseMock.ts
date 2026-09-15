import { vi } from "vitest";

export interface MockResult {
  data?: unknown;
  error?: { message: string } | null;
}

/**
 * Minimal stand-in for a PostgREST query builder: every chain method
 * (select/insert/.../eq/order...) returns itself so arbitrary chains work,
 * `.single()`/`.maybeSingle()` resolve the configured result, and the
 * builder is itself thenable so `await supabase.from(...).select()...`
 * (with no terminal method) resolves too — matching how the real client
 * behaves either way.
 */
export function createChainableMock(result: MockResult = { data: null, error: null }) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const chain: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "in",
    "is",
    "order",
    "lt",
    "lte",
    "gt",
    "gte",
    "limit",
  ];
  for (const method of chainMethods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(resolved));
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolved));
  chain.then = (onFulfilled: (v: typeof resolved) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}
