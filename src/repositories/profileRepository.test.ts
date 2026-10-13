import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}));

import { supabase } from "@/lib/supabase";
import { setCoverPreset, updateProfileDetails, uploadAvatar, uploadCoverPhoto } from "@/repositories/profileRepository";

const from = vi.mocked(supabase.from);
const storageFrom = vi.mocked(supabase.storage.from);

function makeFile(name = "photo.png"): File {
  return new File(["fake-bytes"], name, { type: "image/png" });
}

beforeEach(() => {
  from.mockReset();
  storageFrom.mockReset();
});

describe("uploadAvatar", () => {
  it("uploads the file to the user's own folder, updates avatar_url and returns the public URL", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "user-1/avatar.png" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/avatars/user-1/avatar.png" } });
    storageFrom.mockReturnValue({ upload, getPublicUrl } as never);

    const updateMock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(updateMock as never);

    const url = await uploadAvatar("user-1", makeFile());

    expect(storageFrom).toHaveBeenCalledWith("avatars");
    expect(upload).toHaveBeenCalledWith("user-1/avatar.png", expect.anything(), expect.objectContaining({ upsert: true }));
    expect(from).toHaveBeenCalledWith("profiles");
    expect(updateMock.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: expect.stringContaining("https://cdn.test/avatars/user-1/avatar.png") }));
    expect(updateMock.eq).toHaveBeenCalledWith("id", "user-1");
    expect(url).toContain("https://cdn.test/avatars/user-1/avatar.png");
  });

  it("throws when the upload fails", async () => {
    const upload = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    storageFrom.mockReturnValue({ upload, getPublicUrl: vi.fn() } as never);

    await expect(uploadAvatar("user-1", makeFile())).rejects.toBeTruthy();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("uploadCoverPhoto", () => {
  it("uploads to a cover-named path and updates cover_url", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "user-1/cover.png" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/avatars/user-1/cover.png" } });
    storageFrom.mockReturnValue({ upload, getPublicUrl } as never);

    const updateMock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(updateMock as never);

    const url = await uploadCoverPhoto("user-1", makeFile("banner.jpg"));

    expect(upload).toHaveBeenCalledWith("user-1/cover.jpg", expect.anything(), expect.objectContaining({ upsert: true }));
    expect(updateMock.update).toHaveBeenCalledWith(expect.objectContaining({ cover_url: expect.stringContaining("https://cdn.test/avatars/user-1/cover.png") }));
    expect(url).toContain("https://cdn.test/avatars/user-1/cover.png");
  });
});

describe("updateProfileDetails", () => {
  it("only sends the fields that were provided", async () => {
    const updateMock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(updateMock as never);

    await updateProfileDetails("user-1", { fullName: "Ana Teste" });

    expect(from).toHaveBeenCalledWith("profiles");
    expect(updateMock.update).toHaveBeenCalledWith({ full_name: "Ana Teste" });
    expect(updateMock.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("maps teamsUrl, whatsappNumber and birthday to their snake_case columns, allowing null to clear them", async () => {
    const updateMock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(updateMock as never);

    await updateProfileDetails("user-1", { teamsUrl: "https://teams.microsoft.com/x", whatsappNumber: null, birthday: "1990-05-20" });

    expect(updateMock.update).toHaveBeenCalledWith({
      teams_url: "https://teams.microsoft.com/x",
      whatsapp_number: null,
      birthday: "1990-05-20",
    });
  });

  it("throws when the update fails", async () => {
    const updateMock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValue(updateMock as never);

    await expect(updateProfileDetails("user-1", { fullName: "x" })).rejects.toBeTruthy();
  });
});

describe("setCoverPreset", () => {
  it("stores a preset: marker in cover_url", async () => {
    const updateMock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(updateMock as never);

    await setCoverPreset("user-1", "navy-lime-diagonal");

    expect(updateMock.update).toHaveBeenCalledWith({ cover_url: "preset:navy-lime-diagonal" });
    expect(updateMock.eq).toHaveBeenCalledWith("id", "user-1");
  });
});
