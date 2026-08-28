import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeadProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Barra de navegação/filtro da tela (ex: seletor de mês). Some abaixo das actions no mobile. */
  toolbar?: ReactNode;
  className?: string;
}

/**
 * Page head padrão Studoo (`.page-head`).
 * Layout: eyebrow mono + título + subtítulo à esquerda, actions à direita.
 *
 * IMPORTANTE: este é o ÚNICO <h1> da página. O TopBar repete o título como
 * texto de shell (sem heading) pra não duplicar a hierarquia semântica.
 */
export const PageHead = ({
  eyebrow,
  title,
  subtitle,
  actions,
  toolbar,
  className,
}: PageHeadProps) => (
  <header
    className={cn(
      "hidden md:flex items-end justify-between gap-6 mb-8",
      className,
    )}
  >
    <div className="flex flex-col gap-1 min-w-0">
      {eyebrow && (
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </span>
      )}
      <h1 className="text-[28px] font-bold tracking-[-0.025em] leading-[1.15] m-0">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14.5px] text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
    {(actions || toolbar) && (
      <div className="flex items-center gap-2 shrink-0">
        {toolbar}
        {actions}
      </div>
    )}
  </header>
);

/**
 * Versão mobile do page-head.
 *
 * Aceita `actions` de propósito: antes elas viviam só no PageHead desktop
 * (`hidden md:flex`), então "Nova aula", "Gerar cobranças" e "Exportar CSV"
 * simplesmente não existiam no celular — que é onde o professor usa o app
 * entre uma aula e outra.
 */
export const PageHeadMobile = ({
  eyebrow,
  title,
  subtitle,
  actions,
  toolbar,
  className,
}: PageHeadProps) => (
  <div className={cn("md:hidden mb-5", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary block mb-0.5">
            {eyebrow}
          </span>
        )}
        <h1 className="t-h1">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {actions}
        </div>
      )}
    </div>
    {toolbar && <div className="mt-3">{toolbar}</div>}
  </div>
);
