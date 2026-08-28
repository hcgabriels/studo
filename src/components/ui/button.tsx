import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-semibold tracking-tight",
    "rounded-md border border-transparent",
    "transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-65",
    "active:scale-[0.98]",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.92)]",
        outline:
          "bg-transparent text-foreground border-border hover:bg-secondary hover:border-[hsl(var(--border)/0.7)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        secondary:
          "bg-secondary text-foreground border-border hover:bg-accent",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "bg-transparent text-primary underline-offset-4 hover:underline border-none",
      },
      size: {
        sm: "h-8 px-3 text-[13px] gap-1.5 [&_svg]:size-3.5",
        default: "h-[38px] px-3.5 text-[13.5px] [&_svg]:size-[15px]",
        lg: "h-11 px-[18px] text-[14.5px] [&_svg]:size-4",
        icon: "h-[38px] w-[38px] p-0 [&_svg]:size-[15px]",
        // 32×32 visuais. Em telas de toque, um ::after invisível de -6px em
        // volta leva a área de toque pra 44×44 (WCAG 2.5.8) sem mexer no
        // layout. Fica desligado no mouse pra não invadir o botão vizinho.
        "icon-sm":
          "relative h-8 w-8 p-0 [&_svg]:size-3.5 after:absolute after:inset-[-6px] after:hidden [@media(pointer:coarse)]:after:block",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
