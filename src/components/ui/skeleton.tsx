import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("neu-sunken animate-pulse", className)} {...props} />;
}

export { Skeleton };
