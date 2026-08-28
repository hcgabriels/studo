import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { StudooMark, Wordmark } from "@/components/StudooMark";

interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

const LegalLayout = ({ eyebrow, title, updatedAt, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <StudooMark size={22} />
            <Wordmark size={16} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-10 md:py-16">
        <article className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary mb-2">
            {eyebrow}
          </p>
          <h1 className="t-h1 md:text-[40px] md:leading-[1.1] mb-2">{title}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Última atualização · {updatedAt}
          </p>

          <div className="mt-10 prose-legal">{children}</div>
        </article>
      </main>

      <footer className="border-t border-border px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            © {new Date().getFullYear()} Studoo
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/termos"
              className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              Termos
            </Link>
            <Link
              to="/privacidade"
              className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalLayout;
