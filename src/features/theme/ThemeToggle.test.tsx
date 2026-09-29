import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/theme/useTheme", () => ({
  useTheme: vi.fn(),
}));

import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useTheme } from "@/features/theme/useTheme";

const mockUseTheme = vi.mocked(useTheme);

describe("ThemeToggle", () => {
  it("offers to switch to dark mode while the theme is light", () => {
    const toggleTheme = vi.fn();
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme });

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: /ativar modo escuro/i })).toBeInTheDocument();
  });

  it("offers to switch to light mode while the theme is dark", () => {
    const toggleTheme = vi.fn();
    mockUseTheme.mockReturnValue({ theme: "dark", toggleTheme });

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: /ativar modo claro/i })).toBeInTheDocument();
  });

  it("calls toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    const toggleTheme = vi.fn();
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme });

    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));

    expect(toggleTheme).toHaveBeenCalled();
  });
});
