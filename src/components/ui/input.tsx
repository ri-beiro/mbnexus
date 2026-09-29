import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "neu-sunken flex h-10 w-full border-0 bg-transparent px-3.5 py-1 text-sm text-foreground outline-none transition-shadow placeholder:text-[var(--neu-text-label)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:neu-focus",
          (type === "number" || type === "date" || type === "time") && "font-mono",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
