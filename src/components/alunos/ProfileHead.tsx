import type { ReactNode } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";

export interface ProfileStat {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Cor especial do valor. */
  valueTone?: "default" | "ok" | "danger" | "warn";
}

interface ProfileHeadProps {
  name: string;
  /** Renderizado depois do nome — geralmente badges (instrumento, nível, status). */
  badges?: ReactNode;
  /** Renderizado em linha mono com `dot-sep`. Ex: ["email@x.com", "+55 11 ...", "São Paulo · SP"] */
  monoLines?: string[];
  stats?: ProfileStat[];
  actions?: ReactNode;
  className?: string;
}

const valueToneClass: Record<NonNullable<ProfileStat["valueTone"]>, string> = {
  default: "text-foreground",
  ok: "text-success",
  danger: "text-destructive",
  warn: "text-warning",
};

/**
 * Profile head Studoo (`.profile-head`).
 * Top-border gradient amber→transparent, grid `auto/1fr/auto`, stats 4-col
 * separadas por border-right.
 * Especificação `studoo-screens.css` linhas 273-311.
 */
export const ProfileHead = ({
  name,
  badges,
  monoLines,
  stats,
  actions,
  className,
}: ProfileHeadProps) => (
  <div
    className={cn(
      "relative bg-card border border-border rounded-xl p-5 md:p-7 mb-[22px] overflow-hidden",
      "grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-5 md:gap-6 items-start",
      className,
    )}
  >
    {/* Top gradient amber→transparent (.profile-head::before) */}
    <div
      aria-hidden
      className="absolute top-0 left-0 right-0 h-px pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)",
      }}
    />

    <Avatar name={name} size="xl" />

    <div className="flex flex-col gap-2 min-w-0">
      <h1 className="text-[22px] md:text-[26px] font-bold tracking-[-0.025em] leading-[1.1]">
        {name}
      </h1>

      {badges && (
        <div className="flex items-center flex-wrap gap-2.5">{badges}</div>
      )}

      {monoLines && monoLines.length > 0 && (
        <div className="flex items-center flex-wrap gap-2.5">
          {monoLines.map((line, i) => (
            <span key={i} className="inline-flex items-center gap-2.5">
              {i > 0 && (
                <span
                  aria-hidden
                  className="h-[3px] w-[3px] rounded-full bg-muted-foreground/50"
                />
              )}
              <span className="font-mono text-[12.5px] text-muted-foreground whitespace-nowrap">
                {line}
              </span>
            </span>
          ))}
        </div>
      )}

      {stats && stats.length > 0 && (
        <div
          className={cn(
            "grid gap-x-0 gap-y-4 mt-3 pt-[18px] border-t border-border/40",
            // 4 colunas só com tela larga: entre 768px e 1280px a coluna do
            // meio fica estreita (as ações ocupam a direita) e os números se
            // sobrepunham ("Aulas no total" em cima de "Presença").
            stats.length === 4 && "grid-cols-2 xl:grid-cols-4",
            stats.length === 3 && "grid-cols-3",
            stats.length === 2 && "grid-cols-2",
          )}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-1 min-w-0 pr-4 md:pr-[18px] border-border/40",
                stats.length === 4
                  ? cn(
                      i % 2 === 0 ? "border-r" : "pl-4",
                      i < stats.length - 1 ? "xl:border-r" : "xl:border-r-0",
                      i > 0 ? "xl:pl-[18px]" : "xl:pl-0",
                    )
                  : i < stats.length - 1 && "border-r",
              )}
            >
              <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground truncate">
                {s.label}
              </span>
              <span
                className={cn(
                  "font-mono text-[18px] font-semibold tabular-nums tracking-[-0.02em]",
                  valueToneClass[s.valueTone ?? "default"],
                )}
              >
                {s.value}
              </span>
              {s.sub && (
                <span className="text-[11.5px] text-muted-foreground">
                  {s.sub}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {actions && (
      <div className="col-span-2 md:col-span-1 flex items-center gap-2 md:flex-col md:items-stretch md:gap-2">
        {actions}
      </div>
    )}
  </div>
);
