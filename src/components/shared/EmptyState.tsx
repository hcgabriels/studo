import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyTone = "default" | "muted";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** "default" = box bordered (em página). "muted" = sem fundo, padding menor (dentro de cards). */
  tone?: EmptyTone;
  className?: string;
}

/**
 * Empty state padrão Studoo. Use em listas vazias, queries sem resultado, etc.
 * Espec: icon circular `bg-primary-soft text-primary`, título 15px semibold, descrição muted, CTA opcional.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "text-center flex flex-col items-center",
      tone === "default"
        ? "bg-card border border-dashed border-border rounded-xl px-6 py-10 md:py-12"
        : "px-4 py-8",
      className,
    )}
  >
    {Icon && (
      <div className="h-12 w-12 rounded-full bg-primary-soft border border-primary-ring flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    )}
    <p className="text-[15px] font-semibold tracking-[-0.015em] text-foreground">
      {title}
    </p>
    {description && (
      <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-[320px] leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
