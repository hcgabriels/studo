import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type IconTone = "default" | "ok" | "info" | "warn" | "danger";

interface KpiCardProps {
  label: string;
  icon: React.ElementType;
  iconTone?: IconTone;
  value: ReactNode;
  /** Sufixo do valor (ex: "/22"). Renderizado menor e em fg-3. */
  unit?: ReactNode;
  /** Linha pequena abaixo do valor (texto + delta opcional). */
  hint?: ReactNode;
  /** Delta percentual (ex: 12 → "+12%"). Cor automática (success/destructive). */
  delta?: number | null;
  /** Quando `false`, subir é ruim (ex: inadimplentes). Default: true. */
  deltaPositiveGood?: boolean;
  loading?: boolean;
  /** Quando preenchido, torna o card clicável e mostra arrow no canto. */
  to?: string;
  className?: string;
}

const toneStyles: Record<IconTone, string> = {
  default: "bg-primary-soft text-primary border-primary-ring",
  ok: "bg-[hsl(var(--success)/0.14)] text-success border-success/25",
  info: "bg-[hsl(var(--info)/0.14)] text-info border-info/25",
  warn: "bg-[hsl(var(--warning)/0.14)] text-warning border-warning/25",
  danger:
    "bg-[hsl(var(--destructive)/0.14)] text-destructive border-destructive/25",
};

/**
 * KPI card padrão Studoo (`.kpi`).
 * Layout: row (lbl mono + ico variant), val grande mono 32px, hint+delta.
 * Especificação `studoo-screens.css` linhas 6-53.
 */
export const KpiCard = ({
  label,
  icon: Icon,
  iconTone = "default",
  value,
  unit,
  hint,
  delta,
  deltaPositiveGood = true,
  loading,
  to,
  className,
}: KpiCardProps) => {
  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...(wrapperProps as { to: string })}
      className={cn(
        "bg-card border border-border rounded-xl px-6 pt-[22px] pb-6",
        "flex flex-col gap-3.5 transition-colors duration-150 hover:border-border/80",
        to && "group cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground whitespace-nowrap">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {to && (
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          )}
          <div
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center border shrink-0",
              toneStyles[iconTone],
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-8 w-24" />
      ) : (
        <div className="font-mono text-[32px] font-bold tracking-[-0.025em] leading-none tabular-nums text-foreground">
          {value}
          {unit && (
            <span className="ml-1 text-[16px] text-muted-foreground font-medium tracking-normal">
              {unit}
            </span>
          )}
        </div>
      )}

      {(hint || delta != null) && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {delta != null && <DeltaBadge value={delta} positiveGood={deltaPositiveGood} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </Wrapper>
  );
};

const DeltaBadge = ({
  value,
  positiveGood,
}: {
  value: number;
  positiveGood: boolean;
}) => {
  if (!isFinite(value)) return null;
  const rounded = Math.round(value);
  const dir: "up" | "down" | "flat" =
    rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";

  const isGood =
    dir === "flat" || (dir === "up" && positiveGood) || (dir === "down" && !positiveGood);
  const color =
    dir === "flat" ? "text-muted-foreground" : isGood ? "text-success" : "text-destructive";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[12.5px] font-semibold tabular-nums",
        color,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
};
