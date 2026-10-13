import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Profile } from "@/types/database";
import type { SessionRole } from "@/permissions/types";

const mockUseAuth = vi.fn();
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  uploadAvatar: vi.fn(),
  uploadCoverPhoto: vi.fn(),
}));

import { ProfilePanel } from "@/features/profile/ProfilePanel";
import { uploadAvatar, uploadCoverPhoto } from "@/repositories/profileRepository";

const mockUploadAvatar = vi.mocked(uploadAvatar);
const mockUploadCoverPhoto = vi.mocked(uploadCoverPhoto);

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    organization_id: "org-1",
    full_name: "Ana Teste",
    email: "ana@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    cover_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const ROLES: SessionRole[] = [];

function setAuth(profile: Profile, refresh = vi.fn().mockResolvedValue(undefined)) {
  mockUseAuth.mockReturnValue({ profile, roles: ROLES, refresh });
  return refresh;
}

function renderPanel() {
  return render(
    <ToastProvider>
      <ProfilePanel />
    </ToastProvider>,
  );
}

function makeFile(name = "photo.png") {
  return new File(["fake-bytes"], name, { type: "image/png" });
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUploadAvatar.mockReset();
  mockUploadCoverPhoto.mockReset();
});

describe("ProfilePanel", () => {
  it("shows the signed-in person's name and email", () => {
    setAuth(makeProfile());
    renderPanel();
    expect(screen.getByText("Ana Teste")).toBeInTheDocument();
    expect(screen.getByText("ana@mbnexus.dev")).toBeInTheDocument();
  });

  it("uploads a new avatar and refreshes the profile", async () => {
    const user = userEvent.setup();
    const refresh = setAuth(makeProfile());
    mockUploadAvatar.mockResolvedValue("https://cdn.test/avatar.png");

    renderPanel();
    const input = screen.getByLabelText(/alterar foto de perfil/i);
    await user.upload(input, makeFile());

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith("user-1", expect.any(File)));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("uploads a new cover photo and refreshes the profile", async () => {
    const user = userEvent.setup();
    const refresh = setAuth(makeProfile());
    mockUploadCoverPhoto.mockResolvedValue("https://cdn.test/cover.png");

    renderPanel();
    const input = screen.getByLabelText(/alterar foto de capa/i);
    await user.upload(input, makeFile("banner.jpg"));

    await waitFor(() => expect(mockUploadCoverPhoto).toHaveBeenCalledWith("user-1", expect.any(File)));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows a toast and does not refresh when the avatar upload fails", async () => {
    const user = userEvent.setup();
    const refresh = setAuth(makeProfile());
    mockUploadAvatar.mockRejectedValue(new Error("falhou"));

    renderPanel();
    const input = screen.getByLabelText(/alterar foto de perfil/i);
    await user.upload(input, makeFile());

    expect(await screen.findByText(/não foi possível atualizar a foto/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects a non-image file without calling the upload repository", async () => {
    setAuth(makeProfile());

    renderPanel();
    const input = screen.getByLabelText(/alterar foto de perfil/i) as HTMLInputElement;
    const textFile = new File(["not an image"], "doc.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [textFile] });
    fireEvent.change(input);

    expect(await screen.findByText(/selecione um arquivo de imagem/i)).toBeInTheDocument();
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });
});
