import { cn } from "@/lib/utils";

/** A small lime count pill next to a page's H1 — an at-a-glance "how many"
 * echoing the eyebrow/badge pattern used throughout the app's hero panels. */
export function CountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "neu-pop-in inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 font-mono text-xs font-semibold text-[var(--neu-lime-solid)]",
        className,
      )}
    >
      {value}
    </span>
  );
}
