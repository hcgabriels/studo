import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/hooks/useFieldControl";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
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
      <input
        type={type}
        id={field?.id ?? id}
        aria-describedby={describedBy ?? field?.describedBy}
        aria-invalid={invalid ?? (field?.invalid || undefined)}
        className={cn(
          "flex h-[38px] w-full rounded-md border border-[hsl(var(--border-field))] bg-background px-3 py-0 text-[13.5px] tracking-tight transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground/70",
          "hover:border-[hsl(var(--border)/0.7)]",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.28)]",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-[hsl(var(--destructive)/0.28)]",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
