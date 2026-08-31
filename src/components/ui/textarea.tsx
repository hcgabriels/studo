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
          "flex min-h-[60px] w-full rounded-md border border-[hsl(var(--border-field)/0.78)] bg-input/55 px-3 py-2 text-[13.5px] tracking-tight placeholder:text-muted-foreground/70 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-[background-color,border-color,box-shadow]",
          "hover:border-[hsl(var(--border-field))] hover:bg-input/75",
          "focus-visible:outline-none focus-visible:border-primary/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.18)]",
          "aria-[invalid=true]:border-destructive/80 aria-[invalid=true]:focus-visible:ring-[hsl(var(--destructive)/0.18)]",
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
