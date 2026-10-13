import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { isBirthdayToday } from "@/features/profile/birthdayLogic";

const BALLOON_COLORS = ["#bef91b", "#5c8a00", "#4fb3d9", "#ff8fab", "#ffd166"];

/** Shown to the signed-in person only, on their own birthday — no
 * team-wide announcement. Lives in AppLayout so it mounts once per
 * session (on login / page load) rather than once ever. */
export function BirthdayBalloons() {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const birthdayToday = isBirthdayToday(profile?.birthday ?? null, new Date());
  if (!profile || !birthdayToday || dismissed) return null;

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {BALLOON_COLORS.concat(BALLOON_COLORS).map((color, i) => (
        <span
          key={i}
          className="balloon-rise absolute bottom-[-120px] block h-14 w-11 rounded-[50%]"
          style={{
            left: `${(i * 97) % 100}%`,
            background: color,
            animationDelay: `${i * 0.45}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        />
      ))}

      <div className="pointer-events-auto absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--neu-surface-from)] px-5 py-2.5 shadow-lg">
        <span className="text-sm font-semibold">🎉 Feliz aniversário, {firstName}!</span>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-[var(--neu-lime-solid)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
