import { CHART_PALETTE_DONUT, corDaSerie } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  value: number;
  /** Cor da fatia (CSS color). Default: paleta Studoo ciclando. */
  color?: string;
}

interface DonutProps {
  slices: DonutSlice[];
  /** Texto grande no centro (geralmente total). */
  centerValue: string | number;
  /** Label menor abaixo do valor central, mono uppercase. */
  centerLabel?: string;
  /** Tamanho do donut em px. Default 168. */
  size?: number;
  className?: string;
}

/**
 * Donut chart Studoo (`.donut`) — usa conic-gradient.
 * Especificação `studoo-screens.css` linhas 772-793.
 */
export const Donut = ({
  slices,
  centerValue,
  centerLabel,
  size = 168,
  className,
}: DonutProps) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div
        className={cn(
          "rounded-full border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        Sem dados
      </div>
    );
  }

  // Constrói conic-gradient acumulativo (reduce evita reassign de `let` no render)
  const { stops } = slices.reduce<{ acc: number; stops: string[] }>(
    (state, s, i) => {
      const color = s.color ?? corDaSerie(CHART_PALETTE_DONUT, i);
      const start = (state.acc / total) * 100;
      const nextAcc = state.acc + s.value;
      const end = (nextAcc / total) * 100;
      return {
        acc: nextAcc,
        stops: [...state.stops, `${color} ${start}% ${end}%`],
      };
    },
    { acc: 0, stops: [] },
  );
  const gradient = `conic-gradient(${stops.join(", ")})`;
  const ringWidth = Math.max(20, Math.round(size * 0.13));

  return (
    <div
      className={cn("relative shrink-0 rounded-full", className)}
      style={{ width: size, height: size, background: gradient }}
    >
      {/* Furo central */}
      <div
        className="absolute rounded-full bg-card"
        style={{ inset: ringWidth }}
      />
      {/* Conteúdo central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[1]">
        <div className="font-mono text-[28px] font-bold tabular-nums tracking-[-0.02em] text-foreground leading-none">
          {centerValue}
        </div>
        {centerLabel && (
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground mt-1">
            {centerLabel}
          </div>
        )}
      </div>
    </div>
  );
};

interface DonutLegendProps {
  slices: DonutSlice[];
  className?: string;
}

/**
 * Legenda associada ao Donut (`.legend`).
 */
export const DonutLegend = ({ slices, className }: DonutLegendProps) => (
  <div className={cn("flex flex-col gap-2.5 flex-1", className)}>
    {slices.map((s, i) => (
      <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-[3px] shrink-0"
          style={{
            background: s.color ?? corDaSerie(CHART_PALETTE_DONUT, i),
          }}
        />
        <span className="flex-1 text-foreground/80 truncate">{s.label}</span>
        <span className="font-mono tabular-nums font-semibold text-foreground">
          {s.value}
        </span>
      </div>
    ))}
  </div>
);
