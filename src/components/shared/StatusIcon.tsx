import { Check, AlertTriangle, X, Info, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusVariant = "ok" | "warn" | "danger" | "info" | "neutral";

interface StatusIconProps {
  variant: StatusVariant;
  /** Mostrado como `title` (tooltip nativo do browser) e nome acessível. */
  title?: string;
  /**
   * Renderiza o texto ao lado do ícone.
   *
   * O tooltip nativo depende de hover — que não existe no touch. Sem rótulo
   * visível, no celular o status vira puro código de cor (falha WCAG 1.4.1).
   * - "mobile" (padrão): texto visível até `sm`, só ícone acima disso.
   * - "always" / "never": força o comportamento.
   */
  showLabel?: "mobile" | "always" | "never";
  className?: string;
}

const styles: Record<StatusVariant, string> = {
  ok: "bg-[hsl(var(--success)/0.14)] text-success border-success/25",
  warn: "bg-[hsl(var(--warning)/0.14)] text-warning border-warning/25",
  danger:
    "bg-[hsl(var(--destructive)/0.14)] text-destructive border-destructive/25",
  info: "bg-[hsl(var(--info)/0.14)] text-info border-info/25",
  neutral: "bg-secondary text-muted-foreground border-border",
};

const icons: Record<StatusVariant, React.ElementType> = {
  ok: Check,
  warn: AlertTriangle,
  danger: X,
  info: Info,
  neutral: Minus,
};

/**
 * Status icon circular 22px com 5 variantes (`.status-icon`).
 * Substitui Badge de texto em listas densas; usa tooltip nativo.
 * Especificação `studoo.css` linhas 655-669.
 */
const labelVisibility: Record<NonNullable<StatusIconProps["showLabel"]>, string> =
  {
    mobile: "sm:hidden",
    always: "",
    never: "hidden",
  };

export const StatusIcon = ({
  variant,
  title,
  showLabel = "never",
  className,
}: StatusIconProps) => {
  const Icon = icons[variant];
  const mostraTexto = Boolean(title) && showLabel !== "never";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 min-w-0", className)}
      title={title}
    >
      <span
        role={title ? "img" : undefined}
        aria-label={title}
        className={cn(
          "inline-flex items-center justify-center h-[22px] w-[22px] rounded-full border shrink-0",
          "transition-transform duration-150 hover:scale-[1.12]",
          styles[variant],
        )}
      >
        <Icon className="h-[11px] w-[11px]" strokeWidth={2.5} />
      </span>
      {mostraTexto && (
        <span
          aria-hidden="true"
          className={cn(
            "text-[12px] text-muted-foreground truncate",
            labelVisibility[showLabel],
          )}
        >
          {title}
        </span>
      )}
    </span>
  );
};
