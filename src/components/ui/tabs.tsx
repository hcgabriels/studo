import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/**
 * TabsList variant 'studoo' (default): underline amber, border-bottom.
 * Variant 'pill' (legacy): pill rounded mantido pra modal AlunoSheet / segmented switches.
 */
type TabsListVariant = "studoo" | "pill";

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: TabsListVariant;
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = "studoo", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-variant={variant}
    className={cn(
      variant === "studoo"
        ? "flex gap-0.5 border-b border-border text-muted-foreground"
        : "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Pill badge mostrado depois do label. */
  count?: number;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, count, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Studoo style (default). Pill variant fica como override de className.
      "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
      "h-11 px-4 text-[13.5px] font-medium tracking-[-0.005em]",
      "text-muted-foreground hover:text-foreground transition-colors",
      "data-[state=active]:text-foreground",
      // Underline amber via ::after-like span renderizado abaixo
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // Pill legacy override (quando TabsList tem variant=pill)
      "[[data-variant='pill']_&]:h-7 [[data-variant='pill']_&]:px-3 [[data-variant='pill']_&]:rounded-md",
      "[[data-variant='pill']_&]:data-[state=active]:bg-background [[data-variant='pill']_&]:data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  >
    {children}
    {count != null && count > 0 && (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center min-w-4 h-4 px-1.5 rounded-full",
          "bg-primary text-primary-foreground",
          "font-mono text-[9.5px] font-bold leading-none",
        )}
      >
        {count}
      </span>
    )}
    {/* Underline ativa (visível apenas em variant=studoo) */}
    <span
      aria-hidden
      className={cn(
        "absolute left-3 right-3 -bottom-px h-0.5 bg-primary rounded-t",
        "opacity-0 group-data-[state=active]:opacity-100 transition-opacity",
        "[[data-variant='pill']_&]:hidden",
      )}
    />
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
