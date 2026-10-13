// Pre-loaded cover photo choices: CSS gradients only, no stock photography,
// kept inside the navy/lime/gold MB Soft UI palette. `cover_url` stores a
// `preset:<id>` marker for one of these instead of an uploaded image URL.
//
// Every gradient here is defined with percentage-based stops, so it scales
// cleanly at any cover size without needing `background-size` — except
// "dot-grid-navy", which needs an actual tiled pattern and gets one from
// the `.cover-preset-dots` CSS class (see index.css) rather than faking it
// with an inline gradient, which can't tile under `background-size: cover`.

export interface CoverPreset {
  id: string;
  label: string;
  gradient: string;
  /** Extra class applied to the cover element for presets that need a
   * tiled/pseudo-element effect the inline gradient alone can't do. */
  patternClass?: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "navy-lime-diagonal",
    label: "Diagonal navy e lima",
    gradient: "linear-gradient(135deg, #081620 0%, #123349 42%, #1c3d52 64%, #7fae1a 90%, #bef91b 118%)",
  },
  {
    id: "deep-navy",
    label: "Navy profundo",
    gradient: "linear-gradient(160deg, #050f18 0%, #0e2434 55%, #17384c 100%)",
  },
  {
    id: "lime-glow",
    label: "Brilho lima",
    gradient: "radial-gradient(circle at 25% 20%, #5c8a16 0%, #1c3d52 38%, #0e2434 62%, #081620 100%)",
  },
  {
    id: "dusk-teal",
    label: "Teal ao anoitecer",
    gradient: "linear-gradient(125deg, #081620 0%, #0b2a2e 35%, #124a4f 65%, #0e2434 100%)",
  },
  {
    id: "aurora",
    label: "Aurora",
    gradient: "linear-gradient(110deg, #081620 0%, #123349 26%, #1c3d52 46%, #2f6a3c 70%, #8fd12a 90%, #d0ff45 112%)",
  },
  {
    id: "mesh-bloom",
    label: "Mesh lima",
    gradient:
      "radial-gradient(circle at 18% 22%, rgba(190,249,27,0.35) 0%, transparent 38%), " +
      "radial-gradient(circle at 82% 15%, rgba(79,179,217,0.28) 0%, transparent 42%), " +
      "radial-gradient(circle at 70% 88%, rgba(169,225,19,0.22) 0%, transparent 45%), " +
      "linear-gradient(160deg, #081620 0%, #0e2434 100%)",
  },
  {
    id: "dot-grid-navy",
    label: "Pontilhado navy",
    gradient: "linear-gradient(160deg, #081620 0%, #0e2434 100%)",
    patternClass: "cover-preset-dots",
  },
  {
    id: "golden-hour",
    label: "Hora dourada",
    gradient: "linear-gradient(135deg, #081620 0%, #1c3d52 45%, #8a6d1e 85%, #c8a94a 112%)",
  },
  {
    id: "electric-horizon",
    label: "Horizonte elétrico",
    gradient: "linear-gradient(180deg, #081620 0%, #0e2434 55%, #163449 78%, #bef91b 118%)",
  },
  {
    id: "ribbon-sweep",
    label: "Faixa lima",
    gradient: "linear-gradient(125deg, #081620 0%, #081620 42%, #a9e113 48%, #d0ff45 52%, #081620 58%, #081620 100%)",
  },
  {
    id: "starfield",
    label: "Céu estrelado",
    gradient:
      "radial-gradient(circle at 12% 30%, #d0ff45 0%, transparent 1.4%), " +
      "radial-gradient(circle at 28% 68%, #bef91b 0%, transparent 1.1%), " +
      "radial-gradient(circle at 46% 18%, #a9e113 0%, transparent 1.5%), " +
      "radial-gradient(circle at 63% 55%, #d0ff45 0%, transparent 1%), " +
      "radial-gradient(circle at 80% 30%, #bef91b 0%, transparent 1.3%), " +
      "radial-gradient(circle at 90% 72%, #a9e113 0%, transparent 1.1%), " +
      "radial-gradient(circle at 35% 85%, #d0ff45 0%, transparent 0.9%), " +
      "linear-gradient(160deg, #050f18 0%, #0e2434 100%)",
  },
  {
    id: "soft-vignette",
    label: "Vinheta suave",
    gradient: "radial-gradient(ellipse 120% 100% at 50% 0%, #1c3d52 0%, #0e2434 55%, #081620 100%)",
  },
];

export function findCoverPreset(id: string): CoverPreset | undefined {
  return COVER_PRESETS.find((p) => p.id === id);
}

export function coverPresetId(coverUrl: string | null): string | null {
  return coverUrl?.startsWith("preset:") ? coverUrl.slice("preset:".length) : null;
}
