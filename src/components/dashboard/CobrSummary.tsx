import { cn } from "@/lib/utils";

interface CobrCol {
  label: string;
  value: string;
  count: string;
  tone: "ok" | "warn" | "danger";
}

interface CobrSummaryProps {
  cols: CobrCol[];
}

const toneClass: Record<CobrCol["tone"], string> = {
  ok: "text-success",
  warn: "text-warning",
  danger: "text-destructive",
};

/**
 * Sumário de cobranças (`.cobr-summary`) — 3 colunas com border-left divisor.
 * Especificação `studoo-screens.css` linhas 118-134.
 */
export const CobrSummary = ({ cols }: CobrSummaryProps) => (
  <div className="grid grid-cols-3 border-b border-border/60">
    {cols.map((c, i) => (
      <div
        key={c.label}
        className={cn(
          "flex flex-col gap-1.5 px-4 py-4",
          i > 0 && "border-l border-border/40",
        )}
      >
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
          {c.label}
        </span>
        <span
          className={cn(
            "font-mono text-[19px] font-bold tabular-nums tracking-[-0.02em]",
            toneClass[c.tone],
          )}
        >
          {c.value}
        </span>
        <span className="text-[11.5px] text-muted-foreground">{c.count}</span>
      </div>
    ))}
  </div>
);
