import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/features/theme/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="neu-surface-sm neu-surface-hover relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[var(--neu-text-secondary)]"
    >
      <Sun
        style={{ transitionTimingFunction: "cubic-bezier(.2,.7,.3,1)" }}
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 text-[var(--neu-lime-solid)]",
        )}
      />
      <Moon
        style={{ transitionTimingFunction: "cubic-bezier(.2,.7,.3,1)" }}
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100 text-[var(--neu-lime-solid)]" : "rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}
