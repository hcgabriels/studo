import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Professor, Aluno } from "@/types/supabase";

interface Props {
  professor: Professor;
  alunos: Aluno[];
}

/**
 * Flag gravada pela página da Agenda quando o professor realmente abre a
 * agenda. Antes esse passo era inferido de `alunos.some(a => a.status ===
 * "ativo")`, que é praticamente a mesma condição de "cadastrar primeiro
 * aluno" — os dois passos marcavam juntos e a barra pulava pra 50%.
 */
const CHAVE_VISITOU_AGENDA = "studoo:visitou-agenda";

const leuVisitouAgenda = () => {
  try {
    return !!localStorage.getItem(CHAVE_VISITOU_AGENDA);
  } catch {
    // localStorage bloqueado (modo privado / cookies off): trata como não visitado.
    return false;
  }
};

export const OnboardingChecklist = ({ professor, alunos }: Props) => {
  const temAluno = alunos.length > 0;
  const temPix = !!professor.chave_pix;
  const temDadosRecibo = !!professor.cpf_cnpj;

  const [explorouAgenda, setExplorouAgenda] = useState(leuVisitouAgenda);

  // Re-sincroniza ao voltar pra aba/janela e em mudanças vindas de outra aba.
  useEffect(() => {
    const sincroniza = () => setExplorouAgenda(leuVisitouAgenda());
    sincroniza();
    window.addEventListener("storage", sincroniza);
    window.addEventListener("focus", sincroniza);
    return () => {
      window.removeEventListener("storage", sincroniza);
      window.removeEventListener("focus", sincroniza);
    };
  }, []);

  const steps = [
    {
      done: temAluno,
      label: "Cadastrar seu primeiro aluno",
      desc: "Comece criando a base do seu sistema",
      to: "/alunos",
    },
    {
      done: temPix,
      label: "Configurar sua chave PIX",
      desc: "Inclui automaticamente nas cobranças e recibos",
      to: "/configuracoes",
    },
    {
      done: temDadosRecibo,
      label: "Preencher dados para recibo",
      desc: "CPF/CNPJ pra gerar recibos profissionais",
      to: "/configuracoes",
    },
    {
      done: explorouAgenda,
      label: "Conferir sua agenda da semana",
      desc: "Visualize aulas e marque presença",
      to: "/agenda",
    },
  ];

  const completos = steps.filter((s) => s.done).length;
  const pct = Math.round((completos / steps.length) * 100);
  const proximaIndex = steps.findIndex((s) => !s.done);

  if (completos === steps.length) return null;

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 md:p-6">
      {/* Glow ambient sutil */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none"
      />

      <div className="relative">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary">
            Configuração inicial
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {completos}/{steps.length} · {pct}%
          </p>
        </div>
        <h2 className="t-h2 mb-1">Complete sua configuração</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Faltam alguns dados para liberar a experiência completa.
        </p>

        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${completos} de ${steps.length} passos concluídos`}
          aria-label="Progresso da configuração inicial"
          className="h-1 rounded-full bg-border overflow-hidden mb-5"
        >
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-1">
          {steps.map((step, i) => {
            const isProxima = i === proximaIndex;
            return (
              <li key={step.label}>
                <Link
                  to={step.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg transition-colors group",
                    step.done
                      ? "hover:bg-accent/30"
                      : isProxima
                        ? "hover:bg-accent/40"
                        : "hover:bg-accent/30",
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      step.done && "bg-success/20",
                      !step.done && isProxima && "bg-primary/15",
                      !step.done && !isProxima && "border border-border",
                    )}
                  >
                    {step.done ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : isProxima ? (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inset-0 rounded-full bg-primary opacity-60 animate-ping" />
                        <span className="relative h-2 w-2 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step.done && "line-through text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    )}
                  </div>
                  {!step.done && (
                    <ArrowRight
                      className={cn(
                        "h-3.5 w-3.5 transition-colors shrink-0",
                        isProxima
                          ? "text-primary group-hover:translate-x-0.5"
                          : "text-muted-foreground/60 group-hover:text-foreground",
                      )}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
