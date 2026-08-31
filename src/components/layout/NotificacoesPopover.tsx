import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificacoes, type NotifSeverity } from "@/hooks/useNotificacoes";

const dotColor: Record<NotifSeverity, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

/** Seletor dos focáveis usados no focus trap do painel. */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

const NotificacoesPopover = () => {
  const { items } = useNotificacoes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const sinoRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const painelId = `notificacoes${uid}`;

  /** Fecha e devolve o foco pro sino (Esc, clique num item). */
  const fecharComFoco = useCallback(() => {
    setOpen(false);
    sinoRef.current?.focus();
  }, []);

  // Ao abrir, o foco vai pro painel.
  useEffect(() => {
    if (!open) return;
    painelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fecharComFoco();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap: Tab não escapa do popover enquanto ele está aberto.
      const painel = painelRef.current;
      if (!painel) return;
      const focaveis = Array.from(
        painel.querySelectorAll<HTMLElement>(FOCAVEIS),
      ).filter((el) => el.getClientRects().length > 0);
      const ativo = document.activeElement as HTMLElement | null;

      if (focaveis.length === 0) {
        e.preventDefault();
        painel.focus();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const dentro = !!ativo && painel.contains(ativo);

      if (e.shiftKey) {
        if (!dentro || ativo === primeiro || ativo === painel) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (!dentro || ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, fecharComFoco]);

  const count = items.length;
  const hasUrgent = items.some((i) => i.severity === "destructive");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={sinoRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative h-9 w-9 rounded-md border border-border bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center shrink-0",
          open && "bg-secondary text-foreground",
        )}
        aria-label={
          count > 0
            ? `Notificações (${count} ${count === 1 ? "nova" : "novas"})`
            : "Notificações"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? painelId : undefined}
        title="Notificações"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center"
          >
            {hasUrgent && (
              <span className="absolute inset-0 rounded-full bg-destructive opacity-60 animate-ping" />
            )}
            <span
              className={cn(
                "relative h-4 min-w-4 px-1 rounded-full font-mono text-[9px] font-semibold leading-none flex items-center justify-center text-white",
                hasUrgent ? "bg-destructive" : "bg-primary",
              )}
            >
              {count > 9 ? "9+" : count}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={painelRef}
          id={painelId}
          role="dialog"
          aria-label="Notificações"
          aria-modal="false"
          tabIndex={-1}
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-lg z-50 animate-fade-in-up overflow-hidden focus-visible:outline-none"
        >
          <div className="px-4 py-3 border-b border-border flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary mb-0.5">
                Alertas
              </p>
              <p className="text-sm font-semibold">Notificações</p>
            </div>
            {count > 0 && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 flex items-center gap-3">
              <BellOff aria-hidden="true" className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Sem alertas agora.
              </p>
            </div>
          ) : (
            <ul className="max-h-[440px] overflow-y-auto divide-y divide-border">
              {items.map((notif) => {
                const content = (
                  <div className="flex gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                    <div className="pt-1.5">
                      <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
                        {notif.severity === "destructive" && (
                          <span
                            className={cn(
                              "absolute inset-0 rounded-full opacity-60 animate-ping",
                              dotColor[notif.severity],
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "relative h-2 w-2 rounded-full",
                            dotColor[notif.severity],
                          )}
                        />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {notif.description}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={notif.id}>
                    {notif.href ? (
                      <Link
                        to={notif.href}
                        onClick={() => setOpen(false)}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificacoesPopover;
