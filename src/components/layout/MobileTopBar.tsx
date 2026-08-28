import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { StudooMark, Wordmark } from "@/components/StudooMark";
import { useTheme } from "@/contexts/ThemeContext";
import NotificacoesPopover from "./NotificacoesPopover";

/**
 * Header sticky pro mobile (< md).
 * Logo à esquerda + ações (sino, tema) à direita.
 * No desktop fica oculto (TopBar tradicional assume).
 */
const MobileTopBar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 md:hidden flex items-center justify-between gap-3 h-14 px-4 border-b border-border bg-background/85 backdrop-blur-md">
      <Link
        to="/dashboard"
        className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
      >
        <StudooMark size={22} />
        <Wordmark size={17} />
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 ml-1">
          Beta
        </span>
      </Link>

      <div className="flex items-center gap-1.5">
        <NotificacoesPopover />
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-md border border-border bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center shrink-0"
          aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
};

export default MobileTopBar;
