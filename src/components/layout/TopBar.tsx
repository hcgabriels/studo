import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { usePageHeader } from "@/contexts/PageContext";
import { useTheme } from "@/contexts/ThemeContext";
import NotificacoesPopover from "./NotificacoesPopover";

const TopBar = () => {
  const { title, subtitle, eyebrow } = usePageHeader();
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-30 hidden md:flex items-center gap-4 h-16 px-6 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Seção + contexto, nunca o título: o <h1> da página vive no PageHead,
          logo abaixo. Repetir aqui fazia "Alunos" aparecer duas vezes. */}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary truncate m-0">
          {eyebrow ?? title}
        </p>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground truncate mt-0.5 first-letter:uppercase">
            {subtitle}
          </p>
        )}
      </div>

      <div className="font-mono text-xs text-muted-foreground shrink-0 tabular-nums">
        {time}
      </div>

      <NotificacoesPopover />

      <button
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
    </header>
  );
};

export default TopBar;
