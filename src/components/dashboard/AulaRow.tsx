import type { KeyboardEvent, ReactNode } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { StatusIcon, type StatusVariant } from "@/components/shared/StatusIcon";
import { cn } from "@/lib/utils";

interface AulaRowProps {
  hora: string;
  duracaoMin: number;
  nome: string;
  meta: string;
  status: StatusVariant;
  statusTitle?: string;
  actions?: ReactNode;
  onClick?: () => void;
}

/**
 * Linha de aula no painel (`.aula-row`).
 * Especificação `studoo-screens.css` linhas 65-92.
 */
export const AulaRow = ({
  hora,
  duracaoMin,
  nome,
  meta,
  status,
  statusTitle,
  actions,
  onClick,
}: AulaRowProps) => {
  // Linha clicável = botão pro teclado e pro leitor de tela.
  const interativa = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    // Só reage quando o alvo é a própria linha; ações internas cuidam de si.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      // Espaço rolaria a página.
      e.preventDefault();
      onClick();
    }
  };

  const rotulo = [
    `Aula às ${hora}`,
    nome,
    meta,
    `${duracaoMin} minutos`,
    statusTitle,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      onClick={onClick}
      onKeyDown={interativa ? handleKeyDown : undefined}
      role={interativa ? "button" : undefined}
      tabIndex={interativa ? 0 : undefined}
      aria-label={interativa ? rotulo : undefined}
      className={cn(
        "group grid items-center gap-4 px-[22px] py-3",
        "grid-cols-[64px_1fr_auto_auto] border-t border-border/40 first:border-t-0",
        "transition-colors hover:bg-secondary/40",
        interativa &&
          "cursor-pointer focus-within:bg-secondary/40 focus-visible:outline-none focus-visible:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      <div className="flex flex-col">
        <span className="font-mono text-[15px] font-semibold tabular-nums text-foreground leading-none">
          {hora}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground mt-1">
          {duracaoMin} min
        </span>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={nome} size="sm" />
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold truncate">{nome}</div>
          <div className="text-[12.5px] text-muted-foreground truncate">{meta}</div>
        </div>
      </div>
      <StatusIcon variant={status} title={statusTitle} />
      {actions && (
        // group-focus-within: as ações precisam aparecer também no teclado.
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
      {!actions && <div className="w-0" />}
    </div>
  );
};
