import { CHART_PALETTE_BARS, corDaSerie } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

export interface HBarItem {
  label: string;
  /** Numérico — usado pra calcular largura % da fill. */
  value: number;
  /** Texto formatado mostrado à direita. Default: value como string. */
  displayValue?: string;
  /** Cor da fill (CSS color). Default: paleta cicla. */
  color?: string;
}

interface HBarsProps {
  items: HBarItem[];
  /** Valor máximo manual. Default: max do array. */
  maxValue?: number;
  className?: string;
}

/**
 * Horizontal bars Studoo (`.hbars`).
 * Grid 110px / 1fr / 60px (label / track / value).
 * Especificação `studoo-screens.css` linhas 795-801.
 */
export const HBars = ({ items, maxValue, className }: HBarsProps) => {
  const max = maxValue ?? Math.max(1, ...items.map((b) => b.value));
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item, i) => {
        const pct = Math.max(2, (item.value / max) * 100);
        const color = item.color ?? corDaSerie(CHART_PALETTE_BARS, i);
        const display = item.displayValue ?? String(item.value);
        return (
          <div
            key={`${item.label}-${i}`}
            className="grid grid-cols-[110px_1fr_70px] items-center gap-3.5"
          >
            <span className="text-[13px] text-foreground/80 truncate">
              {item.label}
            </span>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="font-mono text-[12.5px] tabular-nums font-semibold text-right text-foreground">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
};
