import { useId, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  /** Label acessível do campo de busca (fica visualmente oculto). */
  searchLabel?: string;
  /** Chips/dropdowns filtros, renderizados após o search. */
  chips?: ReactNode;
  /** Label acessível do grupo de chips. */
  chipsLabel?: string;
  /** Slot direita (sort, view switch). */
  rightSlot?: ReactNode;
  className?: string;
}

/**
 * Filter bar pattern Studoo (`.filter-bar`).
 * Search + chips à esquerda; right-slot à direita (margin-left auto).
 * Especificação `studoo-screens.css` linhas 177-210.
 */
export const FilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  searchLabel = "Buscar",
  chips,
  chipsLabel = "Filtros",
  rightSlot,
  className,
}: FilterBarProps) => {
  const uid = useId();
  const searchId = `busca${uid}`;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap mb-[18px]", className)}>
      <div
        role="search"
        className={cn(
          "flex items-center gap-2 flex-1 min-w-[220px] max-w-[360px] h-[38px] px-3",
          "bg-card border border-border rounded-[10px] transition-colors",
          // O input interno zera o próprio outline, então o foco aparece aqui.
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.28)]",
        )}
      >
        {/* Ícone é decorativo: o nome acessível vem do label abaixo. */}
        <Search
          aria-hidden="true"
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
        />
        <label htmlFor={searchId} className="sr-only">
          {searchLabel}
        </label>
        <input
          id={searchId}
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-0 bg-transparent border-0 focus-visible:outline-none text-[13.5px] text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {chips && (
        <div
          role="group"
          aria-label={chipsLabel}
          className="flex items-center gap-2 flex-wrap"
        >
          {chips}
        </div>
      )}
      {rightSlot && (
        <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
      )}
    </div>
  );
};

interface FilterChipProps {
  label: string;
  /** Mostrado depois do label, em mono, como '·todos' / '·violão'. */
  value?: string;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
  title?: string;
}

/**
 * Chip individual da filter-bar (`.filter-bar .chip`).
 */
export const FilterChip = ({
  label,
  value,
  active,
  onClick,
  icon: Icon,
  title,
}: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    // O estado do chip é um toggle, não uma seleção exclusiva.
    aria-pressed={!!active}
    className={cn(
      "inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px]",
      "text-[12.5px] font-medium border transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      active
        ? "bg-primary-soft text-foreground border-primary-ring"
        : "bg-card text-foreground/85 border-border hover:bg-secondary hover:text-foreground hover:border-border/80",
    )}
  >
    {Icon && <Icon aria-hidden="true" className="h-3 w-3 opacity-70" />}
    {label}
    {value && <span className="font-mono text-muted-foreground">·{value}</span>}
  </button>
);
