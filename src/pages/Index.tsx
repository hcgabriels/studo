import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Play,
} from "lucide-react";

const demoShots = [
  {
    img: "/landing/alunos.png",
    title: "Seus alunos no controle",
    desc: "Cadastro completo, frequência, histórico de aulas e pacotes — tudo num só lugar.",
  },
  {
    img: "/landing/agenda.png",
    title: "Agenda que faz sentido",
    desc: "Veja a semana inteira ou navegue pelo mês. Marque presença em um clique.",
  },
  {
    img: "/landing/financeiro.png",
    title: "Financeiro descomplicado",
    desc: "Você gera as mensalidades do mês num clique, acompanha quem pagou e imprime o recibo em PDF.",
  },
];
import { Button } from "@/components/ui/button";
import { StudooMark, Wordmark } from "@/components/StudooMark";
import {
  useMouseTilt,
  useRevealOnScroll,
  useScrolled,
} from "@/hooks/useLandingAnimations";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Users,
    title: "Gestão de alunos",
    desc: "Cadastre alunos, controle frequência e mantenha o histórico completo num só lugar.",
    bullets: [
      "Múltiplos horários por aluno",
      "Trial e pacotes de aulas",
      "Histórico de WhatsApp",
    ],
  },
  {
    icon: Calendar,
    title: "Agenda que se organiza",
    desc: "Aulas recorrentes, avulsas e reagendamentos com um clique. Sem bagunça.",
    bullets: [
      "Visão semana ou mês",
      "Reposição e reagendamento",
      "Bloqueio de folgas e feriados",
    ],
  },
  {
    icon: DollarSign,
    title: "Cobrança sem esquecer",
    desc: "Gere as mensalidades do mês em um clique, acompanhe quem pagou e emita o recibo.",
    bullets: [
      "Sua chave PIX já no texto da mensagem",
      "Status de inadimplência",
      "Recibo pra imprimir ou salvar em PDF",
    ],
  },
];

const heroBadges = [
  "Beta gratuito",
  "Sem cartão",
  "Roda no navegador do celular",
  "Seus dados são seus",
];

const howItWorks = [
  {
    n: "01",
    title: "Cadastre seus alunos",
    desc: "Importe de uma planilha em CSV ou cadastre na mão. Define horário, valor e instrumento.",
  },
  {
    n: "02",
    title: "Acompanhe a agenda",
    desc: "Veja sua semana, marque presença em um clique e abra o WhatsApp com o lembrete já escrito.",
  },
  {
    n: "03",
    title: "Feche o mês",
    desc: "Gere as mensalidades do mês, marque quem pagou e imprima o recibo de quem pedir.",
  },
];

const realCapabilities = [
  {
    title: "Alunos, pacotes e frequência",
    desc: "Cadastro com instrumento, horários, valor e nível. Pacote de aulas, aula avulsa e histórico de presença.",
  },
  {
    title: "Agenda semanal e mensal",
    desc: "Aulas recorrentes geradas pela sua grade. Reagendou? Arrasta e pronto. Folga e feriado você bloqueia antes.",
  },
  {
    title: "Mensagem pronta pro WhatsApp",
    desc: "O Studoo monta o texto (lembrete de aula, cobrança, resumo da aula) e abre o WhatsApp. Quem manda é você — nada sai sozinho.",
  },
  {
    title: "Mensalidades do mês num clique",
    desc: "Um botão gera as cobranças dos alunos ativos. Você marca quem pagou e vê quem tá atrasado.",
  },
  {
    title: "Recibo na hora",
    desc: "Gera o recibo com seus dados e o do aluno. Imprime ou salva em PDF pelo próprio navegador.",
  },
  {
    title: "Relatórios simples",
    desc: "Frequência, faltas e o que entrou no mês. Sem dashboard cheio de gráfico que ninguém olha.",
  },
];

const planFeatures = [
  "Alunos ilimitados",
  "Agenda semanal e mensal completas",
  "Cobranças do mês e recibo em PDF",
  "Mensagens prontas pro WhatsApp",
  "Importação CSV de planilha",
  "Pacotes e aulas avulsas",
  "Relatórios de frequência",
  "Suporte por email",
];

const faqs = [
  {
    q: "Quanto custa?",
    a: "Hoje, nada. O Studoo tá em beta e é gratuito. Não tem cartão, não tem cobrança, não tem trial pra vencer.",
  },
  {
    q: "E quando começar a cobrar?",
    a: "A gente avisa por email antes de qualquer cobrança começar, e você decide se continua. Ninguém vai ser cobrado de surpresa.",
  },
  {
    q: "Os lembretes vão sozinhos pro aluno?",
    a: "Não. O Studoo escreve a mensagem e abre o WhatsApp já com o texto. Quem aperta o enviar é você — inclusive na cobrança com a chave PIX.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. Você usa direto pelo navegador e a tela se adapta. Não tem app na loja.",
  },
  {
    q: "Os dados dos meus alunos são seguros?",
    a: "Cada professor só enxerga os próprios dados (isolamento por usuário no banco) e o tráfego é criptografado. Os detalhes estão na Política de Privacidade.",
  },
  {
    q: "E se eu já uso planilha?",
    a: "Importa via CSV. Seus alunos entram com horário e valor já configurados, sem redigitar tudo.",
  },
];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-[hsl(33_84%_27%)] dark:text-primary mb-4">
    {children}
  </div>
);

const Index = () => {
  const navScrolled = useScrolled(20);
  const heroRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll();
  useMouseTilt(heroRef, visualRef, { intensity: 0.8 });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav
        className={cn(
          "sticky top-0 z-30 -mb-16 border-b transition-all duration-300",
          navScrolled
            ? "border-border/60 bg-background/90 backdrop-blur-xl shadow-sm"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <StudooMark size={24} />
            <Wordmark size={20} />
          </Link>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          <img
            src="/landing/music-studio-wes-hicks.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.3] dark:opacity-[0.38]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/35" />
          <div className="lp-blob-1 absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="lp-blob-2 absolute top-40 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="lp-blob-3 absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-32 md:pt-40 pb-12 md:pb-20">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-center">
            {/* Texto à esquerda */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Pra professor independente
              </div>
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.02] mb-6 text-balance"
                style={{ letterSpacing: "-0.04em" }}
              >
                Menos administração,
                <br />
                <em className="not-italic text-primary">mais música.</em>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                Studoo organiza suas <b className="text-foreground">aulas</b>,{" "}
                <b className="text-foreground">cobranças</b> e{" "}
                <b className="text-foreground">alunos</b> num lugar só. Pare de
                pular entre planilha, WhatsApp e caderno.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link to="/cadastro">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    Criar conta de graça
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Ver como funciona
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <b className="text-foreground">De graça enquanto tá em beta.</b>{" "}
                  Sem cartão, sem cobrança.
                </span>
              </div>
            </div>

            {/* Screenshot do app à direita */}
            <div className="relative" style={{ perspective: 1600 }}>
              <div
                ref={visualRef}
                className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden transition-transform duration-200 ease-out"
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 h-9 px-4 border-b border-border bg-background/40">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                    studoo.app · painel
                  </div>
                </div>
                <img
                  src="/landing/dashboard.png"
                  alt="Painel do Studoo"
                  loading="eager"
                  className="w-full h-auto block"
                />
              </div>

              {/* Float badges */}
              <div className="lp-bob hidden md:flex absolute -top-4 -left-4 items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 shadow-lg">
                <span className="lp-pulse-halo h-2 w-2 rounded-full bg-primary" />
                <div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
                    Próxima aula
                  </div>
                  <div className="text-xs font-semibold">
                    Marina · em 32 min
                  </div>
                </div>
              </div>
              <div className="lp-bob-delayed hidden md:flex absolute -bottom-4 -right-4 items-center gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5 shadow-lg">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
                    Pagamento recebido
                  </div>
                  <div className="text-xs font-semibold font-mono">
                    R$ 480 · Rafael
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa de promessas reais */}
      <section className="border-y border-border/60 bg-card/30 py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {heroBadges.map((b) => (
              <div key={b} className="lp-reveal flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-foreground/90 leading-snug">
                  {b}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12 lp-reveal">
            <Eyebrow>Recursos</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance"
              style={{ letterSpacing: "-0.03em" }}
            >
              Tudo o que você precisa pra dar aula sem dor de cabeça.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc, bullets }, i) => (
              <div
                key={title}
                className="lp-reveal bg-card border border-border rounded-2xl p-7 transition-colors hover:border-[hsl(var(--border)/0.7)]"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {desc}
                </p>
                <ul className="space-y-2 border-t border-border pt-4">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-sm text-foreground/90"
                    >
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração visual */}
      <section className="py-20 md:py-28 border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12 lp-reveal">
            <Eyebrow>Por dentro do app</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance"
              style={{ letterSpacing: "-0.03em" }}
            >
              Veja como o Studoo organiza seu dia.
            </h2>
          </div>

          <div className="space-y-16 md:space-y-24">
            {demoShots.map((shot, i) => (
              <div
                key={shot.title}
                className={cn(
                  "lp-reveal grid lg:grid-cols-2 gap-8 lg:gap-14 items-center",
                  i % 2 === 1 && "lg:[&>*:first-child]:order-2",
                )}
              >
                <div>
                  <h3
                    className="text-2xl md:text-3xl font-extrabold mb-3 text-balance"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    {shot.title}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {shot.desc}
                  </p>
                </div>
                <div className="relative rounded-2xl border border-border bg-card shadow-md overflow-hidden">
                  <div className="flex items-center gap-2 h-9 px-4 border-b border-border bg-background/40">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    </div>
                    <div className="flex-1 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                      studoo.app
                    </div>
                  </div>
                  <img
                    src={shot.img}
                    alt={shot.title}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 bg-card/30 border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12">
            <Eyebrow>Como funciona</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance"
              style={{ letterSpacing: "-0.03em" }}
            >
              Em três passos você tá rodando.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorks.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-5xl font-bold text-primary/75 mb-4">
                  {s.n}
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que já dá pra fazer hoje */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12">
            <Eyebrow>Feito por quem dá aula</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance"
              style={{ letterSpacing: "-0.03em" }}
            >
              O que já dá pra fazer hoje.
            </h2>
            <p className="text-base text-muted-foreground mt-4 leading-relaxed">
              O Studoo tá em beta. Em vez de prometer, aqui vai a lista do que
              tá funcionando neste momento — e do jeito que funciona.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {realCapabilities.map((c) => (
              <div
                key={c.title}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <h3
                    className="text-base font-bold"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {c.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-20 md:py-28 bg-card/30 border-y border-border/60"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <Eyebrow>Preço</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance mb-3"
              style={{ letterSpacing: "-0.03em" }}
            >
              Enquanto tá em beta, é de graça.
            </h2>
            <p className="text-base text-muted-foreground">
              Não tem cartão, não tem cobrança e não tem trial correndo contra
              você.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative bg-card border border-primary/30 rounded-2xl p-8 shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full font-mono text-[10px] tracking-[0.14em] uppercase font-semibold">
                Beta aberto
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <div
                  className="font-mono text-5xl font-bold text-primary"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  R$ 0
                </div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                tudo liberado durante o beta
              </p>

              <ul className="space-y-2.5 mb-6">
                {planFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/cadastro" className="block">
                <Button className="w-full gap-2" size="lg">
                  Criar conta de graça
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
                Um dia o Studoo vai ter preço. Quando isso acontecer, a gente
                avisa por email antes e você escolhe se continua.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <Eyebrow>Dúvidas</Eyebrow>
            <h2
              className="text-3xl md:text-5xl font-extrabold text-balance"
              style={{ letterSpacing: "-0.03em" }}
            >
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-card border border-border rounded-xl p-5 transition-colors hover:border-[hsl(var(--border)/0.7)] open:border-primary/30"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-base">{f.q}</span>
                  <span className="text-primary font-mono text-xl shrink-0 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden py-20 md:py-28 border-t border-border/60">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img
            src="/landing/guitarist-gabriel-gurrola.webp"
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-[50%_40%] opacity-35"
          />
          <div className="absolute inset-0 bg-background/78" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/65 to-background" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2
            className="text-4xl md:text-6xl font-extrabold mb-4 text-balance"
            style={{ letterSpacing: "-0.04em" }}
          >
            Comece hoje mesmo.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Beta gratuito. Cria a conta, joga seus alunos lá dentro e vê se
            ajuda.
          </p>
          <Link to="/cadastro">
            <Button size="lg" className="gap-2">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <StudooMark size={20} />
            <Wordmark size={16} />
          </div>
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            © {new Date().getFullYear()} Studoo · Gestão pra professores
          </p>
          <div className="flex items-center gap-5">
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

export default Index;
