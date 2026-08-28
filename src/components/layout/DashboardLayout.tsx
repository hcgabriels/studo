import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  MoreHorizontal,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTopBar from "./MobileTopBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageProvider } from "@/contexts/PageContext";
import { useAuth } from "@/contexts/AuthContext";

const primaryNav = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
];

const overflowNav = [
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const isPathActive = (current: string, to: string) =>
  current === to || current.startsWith(to + "/");

/** Id do <main>, alvo do skip-link. */
const CONTEUDO_ID = "conteudo";

/** Seletor dos focáveis usados no focus trap do drawer. */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

const DashboardLayout = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [maisOpen, setMaisOpen] = useState(false);
  const [sairOpen, setSairOpen] = useState(false);
  const maisAtivo = overflowNav.some((i) => isPathActive(location.pathname, i.to));
  const maisBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  /**
   * @param devolveFoco false quando o foco vai pra outro lugar de propósito
   *   (navegação por link ou abertura do dialog de logout).
   */
  const fecharDrawer = useCallback((devolveFoco = true) => {
    setMaisOpen(false);
    if (devolveFoco) {
      // Espera o drawer desmontar antes de devolver o foco ao gatilho.
      requestAnimationFrame(() => maisBtnRef.current?.focus());
    }
  }, []);

  // Lock body scroll quando drawer mobile aberto.
  useEffect(() => {
    if (!maisOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [maisOpen]);

  // Ao abrir, o foco entra no drawer.
  useEffect(() => {
    if (!maisOpen) return;
    drawerRef.current?.focus();
  }, [maisOpen]);

  // Esc fecha (devolvendo o foco) e Tab fica preso dentro do drawer.
  useEffect(() => {
    if (!maisOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fecharDrawer();
        return;
      }
      if (e.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focaveis = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCAVEIS),
      ).filter((el) => el.getClientRects().length > 0);
      const ativo = document.activeElement as HTMLElement | null;

      if (focaveis.length === 0) {
        e.preventDefault();
        drawer.focus();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const dentro = !!ativo && drawer.contains(ativo);

      if (e.shiftKey) {
        if (!dentro || ativo === primeiro || ativo === drawer) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (!dentro || ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maisOpen, fecharDrawer]);

  // Skip-link: foca o <main> em vez de só mudar o hash da URL.
  const pularParaConteudo = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById(CONTEUDO_ID);
    if (!main) return;
    main.focus();
    main.scrollIntoView({ block: "start" });
  };

  return (
    <PageProvider>
      <div className="flex min-h-screen bg-background">
        {/* Primeiro focável da página: só aparece no foco. */}
        <a
          href={`#${CONTEUDO_ID}`}
          onClick={pularParaConteudo}
          className={cn(
            "sr-only focus:not-sr-only",
            "focus:fixed focus:top-3 focus:left-3 focus:z-[100]",
            "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
            "focus:text-[13.5px] focus:font-semibold focus:text-primary-foreground focus:shadow-lg",
          )}
        >
          Pular para o conteúdo
        </a>

        <Sidebar />

        <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-0">
          <MobileTopBar />
          <TopBar />
          <main
            id={CONTEUDO_ID}
            tabIndex={-1}
            className="flex-1 min-w-0 focus:outline-none"
          >
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav — floating pill */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-3 left-3 right-3 z-40 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-between gap-1 px-2 py-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-lg">
            {primaryNav.map(({ to, label, icon: Icon }) => {
              const active = isPathActive(location.pathname, to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-all",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("h-[18px] w-[18px] shrink-0", active && "stroke-[2.2]")}
                  />
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase truncate">
                    {label}
                  </span>
                </Link>
              );
            })}
            <button
              ref={maisBtnRef}
              type="button"
              onClick={() => setMaisOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={maisOpen}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-all",
                maisAtivo
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <MoreHorizontal
                aria-hidden="true"
                className={cn("h-[18px] w-[18px] shrink-0", maisAtivo && "stroke-[2.2]")}
              />
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase truncate">
                Mais
              </span>
            </button>
          </div>
        </nav>

        {/* Mais drawer */}
        {maisOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => fecharDrawer()}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mais opções"
              tabIndex={-1}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-3xl px-4 pt-3 pb-5 animate-fade-in-up shadow-2xl focus:outline-none"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
            >
              <div aria-hidden="true" className="flex justify-center mb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary mb-0.5">
                    Menu
                  </p>
                  <p className="text-sm font-semibold">Mais opções</p>
                </div>
                <button
                  type="button"
                  onClick={() => fecharDrawer()}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="Fechar"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {overflowNav.map(({ to, label, icon: Icon }) => {
                  const active = isPathActive(location.pathname, to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? "page" : undefined}
                      onClick={() => fecharDrawer(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                        active
                          ? "bg-primary/12 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 text-sm">{label}</span>
                    </Link>
                  );
                })}
                <div aria-hidden="true" className="h-px bg-border my-2" />
                <button
                  type="button"
                  onClick={() => {
                    // Fecha o drawer antes pra não ter dois focus traps brigando.
                    fecharDrawer(false);
                    setSairOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 text-left text-sm">Sair</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Logout: ConfirmDialog no lugar do confirm() nativo. */}
        <ConfirmDialog
          open={sairOpen}
          onOpenChange={(aberto) => {
            setSairOpen(aberto);
            if (!aberto) {
              requestAnimationFrame(() => maisBtnRef.current?.focus());
            }
          }}
          title="Sair da conta?"
          description="Você precisará entrar novamente para acessar o Studoo."
          variant="destructive"
          confirmLabel="Sair"
          onConfirm={signOut}
        />
      </div>
    </PageProvider>
  );
};

export default DashboardLayout;
