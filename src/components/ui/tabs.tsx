import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "neu-sunken neu-pill inline-flex h-11 flex-wrap items-center justify-center gap-1 p-1.5 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
      "hover:scale-105 hover:text-[var(--neu-lime-solid)] hover:bg-[rgba(190,249,27,0.09)]",
      "data-[state=active]:scale-105 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold",
      "data-[state=active]:shadow-[6px_6px_14px_var(--neu-d),-4px_-4px_11px_var(--neu-l),0_0_18px_-8px_var(--neu-glow)]",
      "data-[state=active]:hover:scale-105 data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
