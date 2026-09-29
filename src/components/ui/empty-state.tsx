import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("neu-surface-sm flex flex-col items-center justify-center gap-2 p-10 text-center", className)}
    >
      {Icon && (
        <div className="neu-sunken mb-1 flex h-14 w-14 items-center justify-center rounded-full">
          <Icon className="h-6 w-6 text-[var(--neu-text-tertiary)]" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
