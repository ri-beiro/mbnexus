import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-[inset_2px_2px_4px_var(--neu-d),inset_-2px_-2px_4px_var(--neu-l-soft)] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-[var(--neu-lime-solid)]",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/15 text-[var(--neu-error-text)]",
        success: "bg-success/15 text-[var(--neu-lime-solid)]",
        warning: "bg-warning/15 text-[var(--neu-gold-label)]",
        outline: "bg-transparent text-foreground shadow-none",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
