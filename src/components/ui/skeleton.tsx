import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("neu-sunken neu-shimmer", className)} {...props} />;
}

export { Skeleton };
