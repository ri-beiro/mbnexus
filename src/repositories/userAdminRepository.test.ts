import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from "@/lib/supabase";
import { inviteUser } from "@/repositories/userAdminRepository";

const invoke = vi.mocked(supabase.functions.invoke);

beforeEach(() => {
  invoke.mockReset();
});

describe("inviteUser", () => {
  it("invokes the invite-user function with the given input and returns its data", async () => {
    invoke.mockResolvedValue({ data: { profileId: "p-1", teamId: "t-1" }, error: null } as never);

    const result = await inviteUser({
      email: "novo@mbnexus.dev",
      fullName: "Novo Usuário",
      managementUnitId: "mu-1",
      departmentId: "dept-1",
      papel: "analista",
    });

    expect(invoke).toHaveBeenCalledWith("invite-user", {
      body: {
        email: "novo@mbnexus.dev",
        fullName: "Novo Usuário",
        managementUnitId: "mu-1",
        departmentId: "dept-1",
        papel: "analista",
      },
    });
    expect(result).toEqual({ profileId: "p-1", teamId: "t-1" });
  });

  it("throws when the function call errors", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "boom" } } as never);

    await expect(
      inviteUser({
        email: "x@mbnexus.dev",
        fullName: "X",
        managementUnitId: "mu-1",
        departmentId: "dept-1",
        papel: "lider",
      }),
    ).rejects.toBeTruthy();
  });
});
