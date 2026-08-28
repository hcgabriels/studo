import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Quando `studoo` (default), aplica visual do handoff (sem padding interno; use DialogBody dentro). Quando `legacy`, mantém padding `p-6` + `gap-4` antigo (compat). */
  variant?: "studoo" | "legacy";
  /** Largura. Default 560px. */
  size?: "sm" | "default" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-md",
  default: "max-w-[560px]",
  lg: "max-w-[600px]",
  xl: "max-w-[720px]",
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    { className, children, variant = "studoo", size = "default", ...props },
    ref,
  ) => (
    <DialogPortal>
      <DialogOverlay className="bg-[rgba(10,8,7,0.72)] backdrop-blur-sm" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          sizeMap[size],
          variant === "studoo"
            ? "flex flex-col overflow-hidden bg-card border border-border/80 rounded-xl shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] max-h-[calc(100vh-48px)]"
            : "grid gap-4 border border-border bg-card p-6 shadow-lg sm:rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
        {variant === "legacy" && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Quando `studoo` (default), padding 22px + border-bottom + close X integrado. */
  variant?: "studoo" | "legacy";
}

const DialogHeader = ({
  className,
  variant = "studoo",
  children,
  ...props
}: DialogHeaderProps) => {
  if (variant === "legacy") {
    return (
      <div
        className={cn(
          "flex flex-col space-y-1.5 text-center sm:text-left",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 px-[26px] pt-[22px] pb-[18px] border-b border-border/60",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <DialogPrimitive.Close className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

/**
 * Body do dialog Studoo. Padding 22px 26px, overflow-y-auto.
 * Use entre DialogHeader e DialogFooter.
 */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-[26px] py-[22px] overflow-y-auto min-h-0 flex-1",
      className,
    )}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "studoo" | "legacy";
  /** Texto pequeno mono à esquerda (ex: "⌘+Enter pra salvar"). */
  hint?: React.ReactNode;
}

const DialogFooter = ({
  className,
  variant = "studoo",
  hint,
  children,
  ...props
}: DialogFooterProps) => {
  if (variant === "legacy") {
    return (
      <div
        className={cn(
          "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-[26px] py-4 border-t border-border/60 bg-background/45",
        className,
      )}
      {...props}
    >
      {hint && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {hint}
        </span>
      )}
      <div className="flex-1" />
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-[18px] font-semibold leading-tight tracking-[-0.015em] m-0",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[13px] text-muted-foreground mt-1 m-0", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
