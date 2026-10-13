// Pre-loaded cover photo choices: CSS gradients only, no stock photography,
// kept inside the navy/lime MB Soft UI palette. `cover_url` stores a
// `preset:<id>` marker for one of these instead of an uploaded image URL.

export interface CoverPreset {
  id: string;
  label: string;
  gradient: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  { id: "navy-lime-diagonal", label: "Diagonal navy e lima", gradient: "linear-gradient(135deg, #0e2434 0%, #1c3d52 55%, #a9e113 130%)" },
  { id: "deep-navy", label: "Navy profundo", gradient: "linear-gradient(150deg, #081620 0%, #0e2434 60%, #163449 100%)" },
  { id: "lime-glow", label: "Brilho lima", gradient: "radial-gradient(circle at 30% 30%, #4a6b12 0%, #0e2434 55%, #081620 100%)" },
  { id: "dusk-teal", label: "Teal ao anoitecer", gradient: "linear-gradient(120deg, #0b2a2e 0%, #124a4f 50%, #0e2434 100%)" },
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(115deg, #0e2434 0%, #1c3d52 35%, #2f6a3c 70%, #a9e113 100%)" },
  { id: "midnight-dots", label: "Pontos à meia-noite", gradient: "radial-gradient(circle, #1c3d52 1px, transparent 1px), linear-gradient(160deg, #081620 0%, #0e2434 100%)" },
];

export function findCoverPreset(id: string): CoverPreset | undefined {
  return COVER_PRESETS.find((p) => p.id === id);
}

export function coverPresetId(coverUrl: string | null): string | null {
  return coverUrl?.startsWith("preset:") ? coverUrl.slice("preset:".length) : null;
}
