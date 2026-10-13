import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}));

import { supabase } from "@/lib/supabase";
import { uploadAvatar, uploadCoverPhoto } from "@/repositories/profileRepository";

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
