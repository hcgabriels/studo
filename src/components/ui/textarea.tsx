import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/hooks/useFieldControl";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      id,
      "aria-describedby": describedBy,
      "aria-invalid": invalid,
      ...props
    },
    ref
  ) => {
    // Dentro de um <Field>, id/descrição/invalidez vêm do wrapper.
    const field = useFieldControl();
    return (
      <textarea
        id={field?.id ?? id}
        aria-describedby={describedBy ?? field?.describedBy}
        aria-invalid={invalid ?? (field?.invalid || undefined)}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-[hsl(var(--border-field))] bg-background px-3 py-2 text-[13.5px] tracking-tight placeholder:text-muted-foreground transition-colors",
          "hover:border-[hsl(var(--border-field)/0.7)]",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.28)]",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-[hsl(var(--destructive)/0.28)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
