import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  phase: string;
}

/**
 * Honest placeholder for modules scheduled for a later phase (see
 * docs/architecture.md section 11 / roadmap). Deliberately not a fake button
 * or mocked data — the route exists, but the feature genuinely isn't built yet.
 */
export function ComingSoon({ icon, title, phase }: ComingSoonProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={`Este módulo está planejado para a ${phase} do roadmap (ver docs/architecture.md). Ainda não foi implementado.`}
      className="mt-10"
    />
  );
}
