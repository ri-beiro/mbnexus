import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/database";

const mockUseAuth = vi.fn();
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { BirthdayBalloons } from "@/features/profile/BirthdayBalloons";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    organization_id: "org-1",
    full_name: "Ana Teste",
    email: "ana@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    cover_url: null,
    teams_url: null,
    whatsapp_number: null,
    birthday: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-05-20T09:00:00Z"));
  mockUseAuth.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BirthdayBalloons", () => {
  it("shows a birthday celebration with the person's first name when today is their birthday", () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile({ full_name: "Ana Teste", birthday: "1990-05-20" }) });
    render(<BirthdayBalloons />);

    expect(screen.getByText(/feliz aniversário, ana/i)).toBeInTheDocument();
  });

  it("renders nothing when today is not the person's birthday", () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile({ birthday: "1990-06-01" }) });
    render(<BirthdayBalloons />);

    expect(screen.queryByText(/feliz aniversário/i)).not.toBeInTheDocument();
  });

  it("renders nothing when no birthday is set", () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile({ birthday: null }) });
    render(<BirthdayBalloons />);

    expect(screen.queryByText(/feliz aniversário/i)).not.toBeInTheDocument();
  });

  it("dismisses when the close button is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    mockUseAuth.mockReturnValue({ profile: makeProfile({ birthday: "1990-05-20" }) });
    render(<BirthdayBalloons />);

    await user.click(screen.getByRole("button", { name: /fechar/i }));

    expect(screen.queryByText(/feliz aniversário/i)).not.toBeInTheDocument();
  });
});
