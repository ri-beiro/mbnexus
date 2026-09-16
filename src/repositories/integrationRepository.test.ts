import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import { getIntegration, upsertIntegration } from "@/repositories/integrationRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("getIntegration", () => {
  it("fetches the integration row for the given provider", async () => {
    const row = { id: "i1", provider: "microsoft_365", is_enabled: true, config: { organizerUpn: "x@y.com" } };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await getIntegration("microsoft_365");

    expect(from).toHaveBeenCalledWith("integrations");
    expect(mock.eq).toHaveBeenCalledWith("provider", "microsoft_365");
    expect(mock.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(row);
  });

  it("returns null when no integration row exists yet", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    const result = await getIntegration("microsoft_365");

    expect(result).toBeNull();
  });

  it("throws when the query fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValue(mock as never);

    await expect(getIntegration("microsoft_365")).rejects.toThrow("boom");
  });
});

describe("upsertIntegration", () => {
  it("upserts the integration row for the org+provider pair", async () => {
    const row = { id: "i1", provider: "microsoft_365", is_enabled: true, config: { organizerUpn: "x@y.com" } };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await upsertIntegration({
      organizationId: "org-1",
      provider: "microsoft_365",
      isEnabled: true,
      config: { organizerUpn: "x@y.com" },
    });

    expect(from).toHaveBeenCalledWith("integrations");
    expect(mock.upsert).toHaveBeenCalledWith(
      {
        organization_id: "org-1",
        provider: "microsoft_365",
        is_enabled: true,
        config: { organizerUpn: "x@y.com" },
      },
      { onConflict: "organization_id,provider" },
    );
    expect(result).toEqual(row);
  });
});
