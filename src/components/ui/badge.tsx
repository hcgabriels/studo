import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "h-[22px] px-2.5",
    "rounded-full border",
    "text-[11px] font-semibold tracking-[0.02em]",
    "whitespace-nowrap transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary)/0.12)] text-primary border-[hsl(var(--primary)/0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground border-border",
        destructive:
          "bg-[hsl(var(--destructive)/0.14)] text-destructive border-[hsl(var(--destructive)/0.2)]",
        outline: "border-border text-foreground bg-transparent",
        success:
          "bg-[hsl(var(--success)/0.14)] text-success border-[hsl(var(--success)/0.2)]",
        warning:
          "bg-[hsl(var(--warning)/0.14)] text-warning border-[hsl(var(--warning)/0.2)]",
        muted: "bg-muted text-muted-foreground border-transparent",
        info: "bg-[hsl(var(--info)/0.14)] text-info border-[hsl(var(--info)/0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
