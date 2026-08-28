import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  /** Valor numérico — usado pra calcular height%. */
  value: number;
  /** Texto mostrado em cima da barra (formato livre). Se omitido, usa value formatado. */
  displayValue?: string;
  /** Destaca essa barra com cor primary. */
  active?: boolean;
}

interface BarsChartProps {
  items: BarItem[];
  /** Altura total do gráfico em px. Default 180. */
  height?: number;
  /** Valor máximo manual (usado pra calcular %). Default: max do array. */
  maxValue?: number;
  className?: string;
}

/**
 * Bars chart Studoo (`.bars-row`) — gráfico de colunas vertical com value em cima.
 * Especificação `studoo-screens.css` linhas 748-769.
 */
export const BarsChart = ({
  items,
  height = 180,
  maxValue,
  className,
}: BarsChartProps) => {
  const max = maxValue ?? Math.max(1, ...items.map((b) => b.value));

  return (
    <div
      className={cn("flex items-end gap-2 px-1 pt-4 pb-1", className)}
      style={{ height }}
    >
      {items.map((bar, i) => {
        const pct = Math.max(2, (bar.value / max) * 100); // mínimo 2% pra não sumir
        const display = bar.displayValue ?? String(bar.value);
        return (
          <div
            key={`${bar.label}-${i}`}
            className="group flex-1 flex flex-col-reverse items-center gap-2"
          >
            <span
              className={cn(
                "font-mono text-[10.5px] uppercase tracking-[0.04em]",
                bar.active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {bar.label}
            </span>
            <div
              className={cn(
                "w-full rounded-t-md border transition-colors",
                bar.active
                  ? "bg-primary border-primary"
                  : "bg-secondary/80 border-border group-hover:bg-secondary",
              )}
              style={{ height: `${pct}%` }}
            />
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
};
