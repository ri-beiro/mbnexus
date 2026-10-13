import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from "@/lib/supabase";
import { bulkCreateManagementUnits } from "@/repositories/hierarchyRepository";

const from = vi.mocked(supabase.from);
const getUser = vi.mocked(supabase.auth.getUser);

beforeEach(() => {
  from.mockReset();
  getUser.mockReset();
});

function mockOrgLookup(orgId: string) {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } } as never);
  const profileLookup = createChainableMock({ data: { organization_id: orgId }, error: null });
  from.mockReturnValueOnce(profileLookup as never);
  return profileLookup;
}

describe("bulkCreateManagementUnits", () => {
  it("does nothing for an empty list", async () => {
    await bulkCreateManagementUnits([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("inserts one row per name, scoped to the caller's organization", async () => {
    mockOrgLookup("org-1");
    const insertMock = createChainableMock({ data: null, error: null });
    from.mockReturnValueOnce(insertMock as never);

    await bulkCreateManagementUnits(["CD Food Town", "CD Betim"]);

    expect(from).toHaveBeenCalledWith("management_units");
    expect(insertMock.insert).toHaveBeenCalledWith([
      { organization_id: "org-1", name: "CD Food Town" },
      { organization_id: "org-1", name: "CD Betim" },
    ]);
  });

  it("throws when the insert fails", async () => {
    mockOrgLookup("org-1");
    const insertMock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValueOnce(insertMock as never);

    await expect(bulkCreateManagementUnits(["CD Food Town"])).rejects.toBeTruthy();
  });
});
