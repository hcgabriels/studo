interface DayDividerProps {
  label: string;
  /** Quando preenchido, mostra "agora HH:mm" com pulse. */
  now?: string;
}

/**
 * Divisor de dia em listas de aulas (`.day-divider`).
 * Especificação `studoo-screens.css` linhas 94-115.
 */
export const DayDivider = ({ label, now }: DayDividerProps) => (
  <div className="flex items-center gap-3 px-[22px] pt-4 pb-1.5 border-t border-border/40 first:border-t-0 first:pt-1">
    <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground">
      {label}
    </span>
    {now && (
      <span className="font-mono text-[11px] text-primary inline-flex items-center gap-1.5 animate-day-pulse">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        agora {now}
      </span>
    )}
  </div>
);
