import type { KeyboardEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { StatusIcon, type StatusVariant } from "@/components/shared/StatusIcon";
import { cn } from "@/lib/utils";

interface CobrRowProps {
  nome: string;
  due: string;
  amt: string;
  status: StatusVariant;
  statusTitle?: string;
  onClick?: () => void;
}

/**
 * Linha de cobrança no painel (`.cobr-row`).
 * Especificação `studoo-screens.css` linhas 136-148.
 */
export const CobrRow = ({
  nome,
  due,
  amt,
  status,
  statusTitle,
  onClick,
}: CobrRowProps) => {
  // Linha clicável = botão pro teclado e pro leitor de tela.
  const interativa = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      // Espaço rolaria a página.
      e.preventDefault();
      onClick();
    }
  };

  const rotulo = [`Cobrança de ${nome}`, amt, due, statusTitle]
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
        "grid grid-cols-[1fr_auto_auto_auto] gap-3.5 items-center px-[22px] py-3",
        "border-t border-border/40 first-of-type:border-t-0",
        "hover:bg-secondary/40 transition-colors",
        interativa &&
          "cursor-pointer focus-visible:outline-none focus-visible:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={nome} size="sm" />
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{nome}</div>
        </div>
      </div>
      <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
        {due}
      </span>
      <span className="font-mono text-[13.5px] font-semibold tabular-nums tracking-[-0.02em]">
        {amt}
      </span>
      <StatusIcon variant={status} title={statusTitle} />
    </div>
  );
};
