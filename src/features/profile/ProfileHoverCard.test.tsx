import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProfileHoverCard, type HoverableProfile } from "@/features/profile/ProfileHoverCard";

function makeProfile(overrides: Partial<HoverableProfile> = {}): HoverableProfile {
  return {
    id: "user-1",
    full_name: "Ana Teste",
    email: "ana@mbnexus.dev",
    job_title: "Gerente de Projetos",
    avatar_url: null,
    teams_url: null,
    whatsapp_number: null,
    ...overrides,
  };
}

function renderCard(profile: HoverableProfile) {
  return render(
    <ProfileHoverCard profile={profile}>
      <button type="button">trigger</button>
    </ProfileHoverCard>,
  );
}

describe("ProfileHoverCard", () => {
  it("shows the person's name, role and email on hover", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile());

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    expect(await screen.findByText("Ana Teste")).toBeInTheDocument();
    expect(screen.getByText("Gerente de Projetos")).toBeInTheDocument();
    expect(screen.getByText("ana@mbnexus.dev")).toBeInTheDocument();
  });

  it("shows Teams and WhatsApp links when set", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile({ teams_url: "https://teams.microsoft.com/l/x", whatsapp_number: "+55 11 99999-0000" }));

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    const teamsLink = await screen.findByRole("link", { name: /teams/i });
    expect(teamsLink).toHaveAttribute("href", "https://teams.microsoft.com/l/x");
    const waLink = screen.getByRole("link", { name: /whatsapp/i });
    expect(waLink).toHaveAttribute("href", "https://wa.me/5511999990000");
  });

  it("does not show the contact row when neither Teams nor WhatsApp is set", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile());

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    await screen.findByText("Ana Teste");
    expect(screen.queryByRole("link", { name: /teams/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
