import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StudooMark, Wordmark } from "@/components/StudooMark";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  /** Headline curta do form. Ex: "Bom te ver de novo." */
  title: string;
  /** Subtítulo abaixo da headline. */
  subtitle?: ReactNode;
  /** Eyebrow chip primary acima do título. Ex: "Primeiro acesso". */
  eyebrow?: string;
  /** Conteúdo do form. */
  children: ReactNode;
  /** Footer dentro do form (geralmente um Link). */
  footer?: ReactNode;
  /** CTA contextual top-right (alterna entre login/cadastro). */
  topRight?: {
    question: string;
    cta: string;
    to: string;
  };
}

const AuthLayout = ({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  topRight,
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground grid grid-cols-1 lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* ── Esquerda: gradient + brand-block ────────────────────────────── */}
      <aside
        className="relative hidden lg:flex min-h-0 overflow-hidden px-[clamp(64px,5vw,96px)] py-[clamp(44px,4vw,64px)]"
        style={{
          background:
            "linear-gradient(135deg, #2A1D14 0%, #1B1814 40%, #0F0D0A 100%)",
        }}
      >
        <img
          src="/landing/guitarist-gabriel-gurrola.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[52%_center]"
        />
        {/* Tint + vignette */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, rgba(10,8,7,0.42), rgba(10,8,7,0.08) 58%), radial-gradient(120% 80% at 30% 20%, rgba(231,161,58,0.18) 0%, transparent 55%), linear-gradient(180deg, rgba(10,8,7,0.08) 28%, rgba(10,8,7,0.72) 72%, rgba(10,8,7,0.96) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 50%, transparent 24%, rgba(10,8,7,0.48) 100%)",
          }}
        />

        {/* Corner badge mono com pulse */}
        <div className="relative z-10 flex w-full flex-col justify-between text-[hsl(40_33%_94%)]">
          <div className="inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase text-[hsl(40_33%_94%/0.55)] whitespace-nowrap">
            <span
              aria-hidden
              className="relative h-1.5 w-1.5 rounded-full bg-primary"
            >
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
            </span>
            Studoo · 2026
          </div>

          {/* Brand-block no rodapé */}
          <div>
            <div className="relative mb-5 min-h-10">
              <StudooMark
                size={34}
                className="absolute -left-11 top-1/2 -translate-y-1/2"
              />
              <span
                className="block font-extrabold tracking-[-0.045em] leading-none"
                style={{ fontSize: 32 }}
              >
                stud<em className="not-italic text-primary">oo</em>
              </span>
            </div>
            <h2
              className="font-bold tracking-[-0.035em] leading-[1.04] m-0 max-w-[480px]"
              style={{ fontSize: 38, textWrap: "pretty" as never }}
            >
              Menos administração,
              <br />
              <em className="not-italic text-primary">mais música.</em>
            </h2>
            <div className="mt-6 font-mono text-[10.5px] tracking-[0.14em] uppercase flex items-center gap-4 text-[hsl(40_33%_94%/0.42)] whitespace-nowrap">
              <span>© {new Date().getFullYear()} Studoo</span>
              <span
                aria-hidden
                className="h-[3px] w-[3px] rounded-full bg-current opacity-60"
              />
              <Link
                to="/termos"
                className="hover:text-[hsl(40_33%_94%)] transition-colors"
              >
                Termos
              </Link>
              <span
                aria-hidden
                className="h-[3px] w-[3px] rounded-full bg-current opacity-60"
              />
              <Link
                to="/privacidade"
                className="hover:text-[hsl(40_33%_94%)] transition-colors"
              >
                Privacidade
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Direita: form column ─────────────────────────────────────────── */}
      <main className="relative flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:min-h-0 lg:px-[clamp(64px,5vw,96px)] lg:overflow-y-auto">
        {/* Top-right contextual switcher */}
        <div className="w-full max-w-[460px] mx-auto flex min-h-9 items-center justify-between gap-3">
          {/* Mobile: logo aparece (no desktop fica na esquerda) */}
          <Link to="/" className="inline-flex lg:hidden items-center gap-2.5 shrink-0">
            <StudooMark size={22} />
            <Wordmark size={18} />
          </Link>
          {/* Hidden spacer pra desktop alinhar à direita */}
          <span aria-hidden className="hidden lg:block" />

          {topRight && (
            <div className="inline-flex items-center justify-end gap-1 text-[13.5px] text-right">
              <span className="hidden sm:inline text-muted-foreground">{topRight.question}</span>
              <Link
                to={topRight.to}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-primary font-semibold hover:bg-primary-soft transition-colors"
              >
                {topRight.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Form area centralizado verticalmente */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[460px] animate-fade-in-up">
            {eyebrow && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-soft border border-primary-ring mb-4">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-primary">
                  {eyebrow}
                </span>
              </div>
            )}
            <h1
              className={cn(
                "text-[28px] sm:text-[32px] font-bold tracking-[-0.03em] leading-[1.08] m-0 mb-3",
              )}
              style={{ textWrap: "pretty" as never }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[15px] text-muted-foreground leading-[1.5] m-0 mb-8">
                {subtitle}
              </p>
            )}
            {children}
            {footer && (
              <p className="text-center mt-6 text-[13.5px] text-muted-foreground">
                {footer}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
