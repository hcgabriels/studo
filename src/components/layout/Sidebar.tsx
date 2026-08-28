import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { StudooMark, Wordmark } from "@/components/StudooMark";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessor } from "@/hooks/useProfessor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const menuItems = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const NavItem = ({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] transition-colors",
      active
        ? "bg-primary/12 text-primary font-semibold"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    )}
  >
    <Icon aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
    <span className="flex-1 truncate">{label}</span>
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: professor } = useProfessor();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const firstName = professor?.nome?.split(" ")[0] ?? "Professor";
  const fullName = professor?.nome ?? "Professor";
  const initial = professor?.nome?.charAt(0)?.toUpperCase() ?? "?";
  const isConfiguracoesActive =
    location.pathname === "/configuracoes" ||
    location.pathname.startsWith("/configuracoes/");

  return (
    <>
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <StudooMark
              size={22}
              className="transition-opacity group-hover:opacity-80"
            />
            <Wordmark size={17} />
            <span className="ml-auto font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground border border-border rounded-sm px-1.5 py-0.5">
              Beta
            </span>
          </Link>
        </div>

        {/* Section label + Menu */}
        <nav
          aria-label="Navegação principal"
          className="flex-1 px-3 pt-4 pb-2 overflow-y-auto scrollbar-thin"
        >
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground/70 px-3 mb-2">
            Menu
          </p>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={
                  location.pathname === item.to ||
                  location.pathname.startsWith(item.to + "/")
                }
              />
            ))}
          </div>
        </nav>

        {/* Footer: user + Configurações + Sair */}
        <div className="border-t border-sidebar-border p-3 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-primary/25">
              <span className="text-sm font-bold text-primary">{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold truncate leading-tight"
                title={fullName}
              >
                {firstName}
              </p>
              {professor?.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {professor.email}
                </p>
              )}
            </div>
          </div>

          <Link
            to="/configuracoes"
            aria-current={isConfiguracoesActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] transition-colors",
              isConfiguracoesActive
                ? "bg-primary/12 text-primary font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Settings aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
            <span className="flex-1">Ajustes</span>
          </Link>

          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] text-sidebar-foreground/70 hover:bg-[hsl(var(--destructive)/0.1)] hover:text-destructive transition-colors"
          >
            <LogOut aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
            <span className="flex-1 text-left">Sair</span>
          </button>
        </div>
      </aside>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>
              Você precisará entrar novamente para acessar o Studoo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignOutOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={signOut}>
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;
