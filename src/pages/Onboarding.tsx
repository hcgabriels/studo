import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Receipt,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormGrid } from "@/components/shared/FormGrid";
import { Avatar } from "@/components/shared/Avatar";
import { StudooMark, Wordmark } from "@/components/StudooMark";
import { DIAS_SEMANA, DIAS_SEMANA_SHORT, INSTRUMENTOS } from "@/lib/constants";
import { fmtBRL, fmtBRLCompacto } from "@/lib/format";
import { toDateOnly } from "@/lib/dates";
import { formatCpfCnpj } from "@/lib/masks";
import type { AlunoImportRow } from "@/lib/csv";
import { ColarAlunos } from "@/components/alunos/ColarAlunos";
import type { Professor } from "@/types/supabase";

interface FormState {
  endereco: string;
  chave_pix: string;
  cpf_cnpj: string;
  cobrar_falta_sem_aviso: boolean;
  horas_antecedencia_aviso: number;
  aluno_nome: string;
  aluno_instrumento: string;
  /** Turma inteira vinda de um Ctrl+V da planilha. */
  alunos_colados: AlunoImportRow[];
  modo_aluno: "um" | "lista";
  aluno_valor: string;
  aluno_dia: number;
  aluno_horario: string;
  aluno_duracao: number;
}

type CampoErro = "aluno_nome" | "aluno_instrumento";
type Erros = Partial<Record<CampoErro, string>>;

/**
 * Ordem das etapas: o passo de maior valor (primeiro aluno) vem logo depois
 * das boas-vindas, enquanto a energia do professor ainda está alta. Endereço,
 * que é opcional e só alimenta o rodapé do recibo, fica por último.
 *
 * Nada aqui deve ser referenciado por índice mágico — use o `id`.
 */
const STEPS = [
  { id: "boas-vindas", eyebrow: "Boas-vindas", icon: Sparkles },
  { id: "aluno", eyebrow: "Primeiro aluno", icon: UserPlus },
  { id: "cobranca", eyebrow: "Cobrança", icon: Wallet },
  { id: "politica", eyebrow: "Política de faltas", icon: CalendarClock },
  { id: "endereco", eyebrow: "Onde você atende", icon: Receipt },
  { id: "pronto", eyebrow: "Pronto", icon: Check },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const TOTAL_STEPS = STEPS.length;
const ULTIMO_STEP = TOTAL_STEPS - 1;
const ONBOARDING_SHELL = "w-full max-w-5xl mx-auto px-4 md:px-8";

/** Etapas sem formulário: layout centrado, CTA próprio, sem preview. */
const SEM_FORMULARIO: readonly StepId[] = ["boas-vindas", "pronto"];

const DURACOES = [30, 45, 60, 90] as const;

const ROTULO_PREVIEW: Record<StepId, string> = {
  "boas-vindas": "Preview",
  aluno: "Preview · ficha do aluno",
  cobranca: "Preview · recibo",
  politica: "Preview · política",
  endereco: "Preview · rodapé do recibo",
  pronto: "Preview",
};

const formInicial = (p: Professor): FormState => ({
  endereco: p.endereco ?? "",
  chave_pix: p.chave_pix ?? "",
  cpf_cnpj: p.cpf_cnpj ? formatCpfCnpj(p.cpf_cnpj) : "",
  cobrar_falta_sem_aviso: p.cobrar_falta_sem_aviso ?? true,
  horas_antecedencia_aviso: p.horas_antecedencia_aviso ?? 24,
  aluno_nome: "",
  aluno_instrumento: "",
  alunos_colados: [],
  modo_aluno: "um",
  aluno_valor: "",
  aluno_dia: 1,
  aluno_horario: "18:00",
  aluno_duracao: 60,
});

/** Campos do professor que o wizard escreve — usados no save incremental e no final. */
const patchPerfil = (f: FormState): Record<string, unknown> => ({
  endereco: f.endereco.trim() || null,
  chave_pix: f.chave_pix.trim() || null,
  cpf_cnpj: f.cpf_cnpj.trim() || null,
  cobrar_falta_sem_aviso: f.cobrar_falta_sem_aviso,
  horas_antecedencia_aviso: f.horas_antecedencia_aviso,
});

const temAluno = (f: FormState) =>
  f.aluno_nome.trim().length > 0 && f.aluno_instrumento.trim().length > 0;

/** Colar a lista substitui o cadastro de um aluno só. */
const temListaColada = (f: FormState) => f.alunos_colados.length > 0;

const parseValor = (v: string) => parseFloat(v.replace(",", ".")) || 0;

/** Postgres `time` gosta de HH:MM:SS; o <input type="time"> devolve HH:MM. */
const horarioParaBanco = (h: string) => (h.length === 5 ? `${h}:00` : h);

const validarEtapa = (id: StepId, f: FormState): Erros => {
  const erros: Erros = {};
  if (id === "aluno") {
    if (temListaColada(f)) return erros;
    const nome = f.aluno_nome.trim();
    const instrumento = f.aluno_instrumento.trim();
    // Nome sem instrumento era o "aluno-fantasma": o wizard comemorava e não
    // criava nada. Agora um exige o outro — ou preenche os dois, ou nenhum.
    if (nome && !instrumento) {
      erros.aluno_instrumento =
        "Sem o instrumento eu não consigo criar o aluno. Preenche ou apaga o nome pra pular esta etapa.";
    }
    if (!nome && instrumento) {
      erros.aluno_nome = "Falta o nome do aluno.";
    }
  }
  return erros;
};

const TelaCarregando = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const Onboarding = () => {
  const { data: professor } = useProfessor();
  // O ProtectedRoute só renderiza esta rota com o professor carregado; o guard
  // aqui existe pra o wizard poder inicializar o form direto do banco (sem
  // efeito de hidratação) e pro TypeScript.
  if (!professor) return <TelaCarregando />;
  return <OnboardingWizard professor={professor} />;
};

const OnboardingWizard = ({ professor }: { professor: Professor }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [validado, setValidado] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);
  // Hidrata com o que já existe no perfil: quem fechou a aba no meio retoma
  // de onde parou em vez de redigitar tudo.
  const [form, setForm] = useState<FormState>(() => formInicial(professor));

  const etapa = STEPS[step];
  const etapaId: StepId = etapa.id;
  const semFormulario = SEM_FORMULARIO.includes(etapaId);
  const temPreview = !semFormulario;
  const erros = validado ? validarEtapa(etapaId, form) : {};

  /**
   * Save otimista: não bloqueia a navegação nem avisa o professor. Se falhar,
   * o `finalizarMutation` reenvia o pacote completo no fim.
   */
  const salvarParcial = useCallback(
    (f: FormState) => {
      void supabase
        .from("professores")
        .update(patchPerfil(f))
        .eq("id", professor.id)
        .then(({ error }) => {
          if (error) {
            console.error(
              "[Onboarding] save incremental falhou (será refeito ao finalizar):",
              error,
            );
          }
        });
    },
    [professor.id],
  );

  const finalizarMutation = useMutation({
    mutationFn: async ({ pular }: { pular: boolean }) => {
      const update: Record<string, unknown> = { onboarding_completo: true };
      if (!pular) Object.assign(update, patchPerfil(form));

      // Tenta o update completo primeiro.
      let profError = await tryUpdate(professor.id, update);

      // Se falhou por coluna inexistente, retira o campo e tenta de novo
      // (caso a migration de onboarding_completo ainda não tenha sido rodada).
      if (profError && isColumnMissing(profError)) {
        const missing = extractMissingColumn(profError);
        console.warn(
          `[Onboarding] coluna ausente no schema: ${missing}. Retentando sem ela.`,
        );
        const minimal = { ...update };
        if (missing) delete minimal[missing];
        // Última tentativa só com os campos que existem em qualquer schema.
        const safeFields = [
          "chave_pix",
          "cpf_cnpj",
          "endereco",
          "cobrar_falta_sem_aviso",
          "horas_antecedencia_aviso",
        ];
        const safeUpdate: Record<string, unknown> = {};
        for (const k of safeFields) {
          if (k in minimal) safeUpdate[k] = minimal[k];
        }
        profError = Object.keys(safeUpdate).length
          ? await tryUpdate(professor.id, safeUpdate)
          : null;
      }

      if (profError) throw profError;

      // Grava flag local sempre (escape hatch quando a coluna não existe).
      try {
        localStorage.setItem("studoo:onboarding-done", "1");
      } catch {
        /* ignore quota errors */
      }

      if (pular) return { alunoCriado: false, alunoFalhou: false, quantos: 0 };

      if (temListaColada(form)) {
        const quantos = await criarAlunosColados(
          professor.id,
          form.alunos_colados,
        );
        return {
          alunoCriado: quantos > 0,
          alunoFalhou: quantos === 0,
          quantos,
        };
      }

      if (!temAluno(form))
        return { alunoCriado: false, alunoFalhou: false, quantos: 0 };

      const alunoCriado = await criarPrimeiroAluno(professor.id, form);
      return { alunoCriado, alunoFalhou: !alunoCriado, quantos: alunoCriado ? 1 : 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["professor"] });
      qc.invalidateQueries({ queryKey: ["alunos"] });
      qc.invalidateQueries({ queryKey: ["aulas-recorrentes"] });
      if (res.alunoFalhou) {
        toast.warning(
          "Salvei suas configurações, mas não consegui cadastrar o aluno. Dá pra criar ele pelo painel em um minuto.",
        );
      } else if (res.quantos > 1) {
        toast.success(`Pronto! ${res.quantos} alunos já estão na sua carteira.`);
      } else {
        toast.success("Pronto! Bem-vindo ao Studoo");
      }
      navigate("/dashboard");
    },
    onError: (err: unknown) => {
      console.error("[Onboarding] erro ao finalizar:", err);
      toast.error(mensagemHumana(err), {
        description:
          "Dá pra clicar em 'Pular tudo' e ajustar depois nas Configurações.",
        duration: 8000,
      });
    },
  });

  const handlePularTudo = () => {
    // Escape hatch: marca local imediatamente; se a mutation falhar, o gating
    // local libera o acesso ao painel mesmo assim.
    try {
      localStorage.setItem("studoo:onboarding-done", "1");
    } catch {
      /* ignore */
    }
    finalizarMutation.mutate(
      { pular: true },
      {
        onError: () => {
          toast.info("Beleza, tô te levando pro painel. Dá pra ajustar tudo depois.");
          navigate("/dashboard");
        },
      },
    );
  };

  const handleFinalizar = () => finalizarMutation.mutate({ pular: false });

  const avancar = () => {
    const errs = validarEtapa(etapaId, form);
    if (Object.keys(errs).length > 0) {
      setValidado(true);
      return;
    }
    setValidado(false);
    setPreviewAberto(false);
    // Boas-vindas não tem campo: não gasta request.
    if (etapaId !== "boas-vindas") salvarParcial(form);
    setStep((s) => Math.min(s + 1, ULTIMO_STEP));
  };

  const voltar = () => {
    setValidado(false);
    setPreviewAberto(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const preview = (
    <PreviewPane
      etapaId={etapaId}
      form={form}
      professorNome={professor.nome ?? "Professor"}
    />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className={cn(ONBOARDING_SHELL, "h-16 flex items-center justify-between")}>
          <div className="flex items-center gap-2.5">
            <StudooMark size={22} />
            <Wordmark size={16} />
          </div>
          {etapaId !== "pronto" && (
            <button
              onClick={handlePularTudo}
              disabled={finalizarMutation.isPending}
              className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Pular tudo
            </button>
          )}
        </div>
        {/* Progresso */}
        <div className={cn(ONBOARDING_SHELL, "pb-3")}>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary">
              Etapa {step + 1}/{TOTAL_STEPS} · {etapa.eyebrow}
            </p>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
            </p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main
        className={cn(
          "flex-1 py-10 md:py-16 overflow-y-auto",
          "flex items-start justify-center",
        )}
      >
        <div
          className={cn(
            ONBOARDING_SHELL,
            semFormulario ? "max-w-2xl text-center pt-8 md:pt-14" : "max-w-5xl",
            temPreview &&
              "md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 lg:gap-14 md:items-center",
          )}
        >
          <div className="animate-fade-in-up min-w-0">
            {!semFormulario && <StepIcon icon={etapa.icon} />}
            <div className={cn(!semFormulario && "mt-5")}>
              {etapaId === "boas-vindas" && (
                <WelcomeStep
                  nome={professor.nome ?? ""}
                  onStart={avancar}
                  onPular={handlePularTudo}
                  pending={finalizarMutation.isPending}
                />
              )}
              {etapaId === "aluno" && (
                <PrimeiroAlunoStep form={form} setForm={setForm} erros={erros} />
              )}
              {etapaId === "cobranca" && (
                <CobrancaStep form={form} setForm={setForm} />
              )}
              {etapaId === "politica" && (
                <PoliticaStep form={form} setForm={setForm} />
              )}
              {etapaId === "endereco" && (
                <EnderecoStep form={form} setForm={setForm} />
              )}
              {etapaId === "pronto" && (
                <ProntoStep
                  criouAluno={temAluno(form)}
                  nomeAluno={form.aluno_nome.trim()}
                  onFinalizar={handleFinalizar}
                  pending={finalizarMutation.isPending}
                />
              )}
            </div>

            {/* Preview compacto no mobile — colapsado, mas existe. */}
            {temPreview && (
              <div className="md:hidden mt-6">
                <button
                  type="button"
                  onClick={() => setPreviewAberto((v) => !v)}
                  aria-expanded={previewAberto}
                  aria-controls="onb-preview-mobile"
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left"
                >
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                    {ROTULO_PREVIEW[etapaId]}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                      previewAberto && "rotate-180",
                    )}
                  />
                </button>
                {previewAberto && (
                  <div id="onb-preview-mobile" className="mt-3 flex justify-center">
                    {preview}
                  </div>
                )}
              </div>
            )}
          </div>

          {temPreview && (
            <div className="hidden md:flex md:justify-center">{preview}</div>
          )}
        </div>
      </main>

      {/* Footer com navegação (o welcome tem CTA próprio; o "pronto" ganha o
          Voltar pra dar chance de corrigir o aluno antes de entrar no painel) */}
      {etapaId !== "boas-vindas" && (
        <footer className="border-t border-border bg-card/40 backdrop-blur-sm">
          <div
            className={cn(ONBOARDING_SHELL, "py-3 flex items-center justify-between")}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
          >
            <Button
              variant="ghost"
              onClick={voltar}
              disabled={finalizarMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {etapaId === "pronto" ? "Voltar e corrigir" : "Voltar"}
            </Button>
            {etapaId !== "pronto" && (
              <Button onClick={avancar} disabled={finalizarMutation.isPending}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </footer>
      )}

      {/* Confetti no step final */}
      {etapaId === "pronto" && <Confetti />}
    </div>
  );
};

const StepIcon = ({ icon: Icon }: { icon: React.ElementType }) => (
  <div className="h-12 w-12 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center">
    <Icon className="h-5 w-5 text-primary" />
  </div>
);

const StepTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="mb-7">
    <h1 className="t-h1 md:text-[36px] md:leading-[1.1] mb-2 text-balance">{title}</h1>
    <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
  </div>
);

const WelcomeStep = ({
  nome,
  onStart,
  onPular,
  pending,
}: {
  nome: string;
  onStart: () => void;
  onPular: () => void;
  pending: boolean;
}) => (
  <>
    <StepTitle
      title={`Olá, ${nome.split(" ")[0] || "professor"}. Bom te ter aqui.`}
      subtitle="Vamos configurar só o básico para você já entrar com agenda, cobranças e recibos no lugar. Depois dá pra editar tudo."
    />
    <div className="space-y-2.5 mb-8">
      {[
        "Cadastrar seu primeiro aluno",
        "Configurar PIX e dados do recibo",
        "Definir sua política de faltas e avisos",
      ].map((item) => (
        <div key={item} className="flex items-center gap-3 text-sm">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="h-3 w-3 text-primary" />
          </div>
          <span className="text-foreground">{item}</span>
        </div>
      ))}
    </div>
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <Button onClick={onStart} disabled={pending} className="sm:w-auto">
        Começar
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
      <Button variant="ghost" onClick={onPular} disabled={pending} className="sm:w-auto">
        Já sei o que faço, pular
      </Button>
    </div>
  </>
);

interface StepFormProps {
  form: FormState;
  setForm: (fn: (f: FormState) => FormState) => void;
}

const PrimeiroAlunoStep = ({
  form,
  setForm,
  erros,
}: StepFormProps & { erros: Erros }) => {
  const colando = form.alunos_colados.length > 0 || form.modo_aluno === "lista";

  return (
  <>
    <StepTitle
      title={colando ? "Importe seus alunos" : "Cadastre seu primeiro aluno"}
      subtitle={
        colando
          ? "Suba um CSV ou cole da planilha. O Studoo detecta as colunas e mostra uma prévia antes de salvar."
          : "Só o essencial — o resto dá pra completar depois no perfil dele. Se preferir, deixa em branco e cadastra pelo painel."
      }
    />

    {/* A maioria chega com a turma numa planilha. Oferecer colar aqui é o que
        tira o professor de 1 aluno pra 25 antes de ele sair do wizard. */}
    <div className="inline-flex p-0.5 gap-px rounded-[10px] bg-secondary border border-border mb-4">
      {([
        { v: "um", label: "Cadastrar um" },
        { v: "lista", label: "Importar alunos" },
      ] as const).map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() =>
            setForm((f) => ({
              ...f,
              modo_aluno: v,
              alunos_colados: v === "um" ? [] : f.alunos_colados,
            }))
          }
          className={cn(
            "h-[30px] px-3 rounded-[7px] text-[12.5px] font-medium transition-colors",
            (v === "lista") === colando
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>

    {colando ? (
      <ColarAlunos
        onChange={(linhas) =>
          setForm((f) => ({ ...f, alunos_colados: linhas }))
        }
      />
    ) : (
    <div className="space-y-3.5">
      <FormGrid cols={2}>
        <Field label="Nome" error={erros.aluno_nome}>
          <Input
            placeholder="Ex: Marina Souza"
            value={form.aluno_nome}
            onChange={(e) => setForm((f) => ({ ...f, aluno_nome: e.target.value }))}
            autoFocus
          />
        </Field>
        <Field
          label={form.aluno_nome.trim() ? "Instrumento *" : "Instrumento"}
          error={erros.aluno_instrumento}
        >
          {/* Era texto livre: dava pra digitar "violao" e o valor não bater
              com nenhuma opção do select na hora de editar o aluno. */}
          <Select
            /* Sempre controlado: com `|| undefined` o Radix reclamava de
               "changing from uncontrolled to controlled" ao escolher o 1º
               instrumento. String vazia já mostra o placeholder. */
            value={form.aluno_instrumento}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, aluno_instrumento: v }))
            }
          >
            <SelectTrigger aria-required={form.aluno_nome.trim() ? true : undefined}>
              <SelectValue placeholder="Escolha o instrumento" />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENTOS.map((inst) => (
                <SelectItem key={inst} value={inst}>
                  {inst}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FormGrid>

      <FormGrid cols={2}>
        <Field label="Mensalidade (R$)" optional>
          <Input
            inputMode="decimal"
            placeholder="350"
            value={form.aluno_valor}
            onChange={(e) => setForm((f) => ({ ...f, aluno_valor: e.target.value }))}
          />
        </Field>
        <Field label="Duração da aula">
          <Select
            value={String(form.aluno_duracao)}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, aluno_duracao: Number(v) }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURACOES.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} minutos
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FormGrid>

      <FormGrid cols={2}>
        <Field label="Dia da aula">
          <Select
            value={String(form.aluno_dia)}
            onValueChange={(v) => setForm((f) => ({ ...f, aluno_dia: Number(v) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAS_SEMANA.map((dia, i) => (
                <SelectItem key={dia} value={String(i)}>
                  {dia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Horário">
          <Input
            type="time"
            value={form.aluno_horario}
            onChange={(e) =>
              setForm((f) => ({ ...f, aluno_horario: e.target.value }))
            }
          />
        </Field>
      </FormGrid>
    </div>
    )}
  </>
  );
};

const CobrancaStep = ({ form, setForm }: StepFormProps) => {
  const pixVazio = form.chave_pix.trim().length === 0;
  return (
    <>
      <StepTitle
        title="Como você recebe?"
        subtitle="A chave PIX entra na mensagem de cobrança que você manda pro aluno. O CPF/CNPJ aparece nos recibos."
      />
      <div className="space-y-3.5">
        <Field label="Chave PIX">
          <Input
            placeholder="email@dominio.com, telefone, CPF ou chave aleatória"
            value={form.chave_pix}
            onChange={(e) => setForm((f) => ({ ...f, chave_pix: e.target.value }))}
            autoFocus
          />
        </Field>

        {pixVazio && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-foreground/85 leading-snug">
              Sem PIX as cobranças vão sem chave — o aluno recebe o valor, mas
              precisa te perguntar pra onde pagar. Dá pra preencher depois em
              Configurações.
            </p>
          </div>
        )}

        <Field
          label="CPF ou CNPJ"
          optional
          hint="Aparece nos recibos pra dar aspecto profissional."
        >
          <Input
            placeholder="000.000.000-00"
            value={form.cpf_cnpj}
            inputMode="numeric"
            onChange={(e) =>
              setForm((f) => ({ ...f, cpf_cnpj: formatCpfCnpj(e.target.value) }))
            }
          />
        </Field>
      </div>
    </>
  );
};

const PoliticaStep = ({ form, setForm }: StepFormProps) => (
  <>
    <StepTitle
      title="Sua política de faltas"
      subtitle="Define como o Studoo trata avisos de cancelamento. Pode trocar depois."
    />
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-card/50">
        <div className="flex-1">
          <p className="text-sm font-medium">Cobrar falta sem aviso</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Se o aluno faltar sem avisar dentro da janela, a aula é mantida como
            cobrada. Recomendado.
          </p>
        </div>
        <Switch
          checked={form.cobrar_falta_sem_aviso}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, cobrar_falta_sem_aviso: v }))
          }
        />
      </div>

      <Field
        label="Antecedência mínima do aviso (horas)"
        hint='Avisos chegando depois desse prazo contam como "sem aviso".'
        className="max-w-[220px]"
      >
        <Input
          type="number"
          min={1}
          max={72}
          value={form.horas_antecedencia_aviso}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              horas_antecedencia_aviso: Math.max(
                1,
                Math.min(72, Number(e.target.value) || 24),
              ),
            }))
          }
        />
      </Field>
    </div>
  </>
);

const EnderecoStep = ({ form, setForm }: StepFormProps) => (
  <>
    <StepTitle
      title="Onde você atende?"
      subtitle="O endereço aparece nos recibos que você emite. Pode pular se atende na casa do aluno ou online."
    />
    <Field
      label="Endereço"
      optional
      hint="Será impresso no rodapé dos recibos. Não fica visível pros alunos no app."
    >
      <Input
        placeholder="Rua, número, bairro, cidade — UF"
        value={form.endereco}
        onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
        autoFocus
      />
    </Field>
  </>
);

const ProntoStep = ({
  criouAluno,
  nomeAluno,
  onFinalizar,
  pending,
}: {
  criouAluno: boolean;
  nomeAluno: string;
  onFinalizar: () => void;
  pending: boolean;
}) => (
  <div className="flex flex-col items-center text-center">
    {/* Ring-pulse + checkmark animado */}
    <div className="relative inline-flex items-center justify-center w-[88px] h-[88px] rounded-full border border-primary mb-6">
      <span className="onb-ring" aria-hidden />
      <span className="onb-ring onb-ring-2" aria-hidden />
      <svg
        viewBox="0 0 24 24"
        className="onb-check w-11 h-11 text-primary"
        aria-hidden
      >
        <path d="M5 12.5l5 5L19 7" />
      </svg>
    </div>

    <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.025em] leading-[1.06] mb-2">
      Pronto. Bora começar.
    </h1>
    <p className="text-muted-foreground leading-relaxed max-w-md">
      {criouAluno
        ? `Ao clicar em "Ir pro painel" eu salvo tudo e já cadastro ${nomeAluno}.`
        : "Seu Studoo já está configurado. Você cadastra os alunos direto no painel quando quiser."}
    </p>

    <div className="bg-card border border-border rounded-lg px-6 py-5 my-7 flex flex-col gap-3 text-left max-w-md w-full">
      {[
        "Cadastrar mais alunos um de cada vez ou via importação",
        "Gerar cobranças do mês com 1 clique",
        "Acompanhar frequência e financeiro pelo painel",
      ].map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-3 text-sm text-muted-foreground onb-stagger"
          style={{ animationDelay: `${700 + i * 120}ms` }}
        >
          <Check className="h-4 w-4 text-success shrink-0" />
          <span>{item}</span>
        </div>
      ))}
    </div>

    <div
      className="onb-stagger flex flex-col sm:flex-row gap-2 justify-center"
      style={{ animationDelay: "1200ms" }}
    >
      <Button size="lg" onClick={onFinalizar} disabled={pending}>
        {pending ? "Salvando..." : "Ir pro painel"}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  </div>
);

// ── Preview pane ─────────────────────────────────────────────────────────

interface PreviewPaneProps {
  etapaId: StepId;
  form: FormState;
  professorNome: string;
}

const PreviewPane = ({ etapaId, form, professorNome }: PreviewPaneProps) => (
  <div className="flex flex-col items-center gap-3 w-full">
    <span className="hidden md:block font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
      {ROTULO_PREVIEW[etapaId]}
    </span>

    <div className="w-full max-w-[320px] bg-card border border-border rounded-xl overflow-hidden shadow-md">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </span>
        <span className="font-mono text-[10px] text-muted-foreground ml-2">
          studoo.app · preview
        </span>
      </div>

      {/* Body */}
      <div className="p-4 min-h-[220px]">
        {etapaId === "aluno" && <PreviewAluno form={form} />}
        {etapaId === "cobranca" && (
          <PreviewCobranca form={form} professorNome={professorNome} />
        )}
        {etapaId === "politica" && <PreviewPolitica form={form} />}
        {etapaId === "endereco" && (
          <PreviewPerfil form={form} professorNome={professorNome} />
        )}
      </div>
    </div>
  </div>
);

const PreviewPerfil = ({
  form,
  professorNome,
}: {
  form: FormState;
  professorNome: string;
}) => (
  <div className="flex flex-col items-center gap-2 text-center py-2">
    <Avatar name={professorNome} size="lg" />
    <p className="font-semibold text-sm">{professorNome || "Seu nome"}</p>
    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
      {form.endereco || "Endereço aparece aqui"}
    </p>
    <div className="w-full mt-3 border-t border-border/40 pt-3 text-[11.5px] text-muted-foreground leading-snug">
      Aparece no rodapé dos recibos que você enviar aos alunos.
    </div>
  </div>
);

const PreviewCobranca = ({
  form,
  professorNome,
}: {
  form: FormState;
  professorNome: string;
}) => {
  const valor = parseValor(form.aluno_valor) || 350;
  return (
    <div className="flex flex-col gap-2 text-[11.5px]">
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
        Recibo ·{" "}
        {new Date()
          .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          .replace(".", "")
          .replace(" de ", "/")}
      </p>
      <p className="font-semibold text-foreground">{professorNome}</p>
      {form.cpf_cnpj && (
        <p className="font-mono text-[10.5px] text-muted-foreground">
          CPF/CNPJ {form.cpf_cnpj}
        </p>
      )}
      <div className="border-t border-border/40 my-2" />
      {form.aluno_nome.trim() && (
        <p className="text-muted-foreground">
          Aluno: <span className="text-foreground">{form.aluno_nome.trim()}</span>
        </p>
      )}
      <p className="text-muted-foreground">PIX:</p>
      <p
        className={cn(
          "font-mono text-[10.5px] break-all",
          form.chave_pix.trim() ? "text-foreground" : "text-warning",
        )}
      >
        {form.chave_pix.trim() || "— sem chave PIX —"}
      </p>
      <div className="border-t border-border/40 my-2" />
      <div className="flex justify-between font-mono">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums">{fmtBRL(valor)}</span>
      </div>
    </div>
  );
};

const PreviewPolitica = ({ form }: { form: FormState }) => (
  <div className="flex flex-col gap-3 text-[12.5px]">
    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
      Regra atual
    </p>
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "h-2 w-2 rounded-full mt-1.5 shrink-0",
          form.cobrar_falta_sem_aviso ? "bg-warning" : "bg-success",
        )}
      />
      <p className="text-foreground/85 leading-relaxed">
        {form.cobrar_falta_sem_aviso
          ? `Avisos chegando depois de ${form.horas_antecedencia_aviso}h da aula são cobrados como falta sem aviso.`
          : "Sem cobrança extra em faltas — mesmo sem aviso."}
      </p>
    </div>
    <div className="border-t border-border/40 my-1" />
    <p className="text-muted-foreground leading-relaxed text-[11.5px]">
      Vale como seu critério na hora de marcar a falta. O Studoo não manda
      mensagem sozinho — quem dispara o WhatsApp é você.
    </p>
  </div>
);

const PreviewAluno = ({ form }: { form: FormState }) => {
  const valor = parseValor(form.aluno_valor);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={form.aluno_nome || "Aluno"} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {form.aluno_nome || "Nome do aluno"}
          </p>
          <p className="font-mono text-[10.5px] text-muted-foreground truncate">
            {form.aluno_instrumento || "Instrumento"}
          </p>
        </div>
      </div>
      <div className="border-t border-border/40" />
      <div className="grid grid-cols-2 gap-3 text-[11.5px]">
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
            Dia/hora
          </p>
          <p className="font-mono mt-0.5 text-foreground">
            {DIAS_SEMANA_SHORT[form.aluno_dia]} · {form.aluno_horario}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
            Mensalidade
          </p>
          <p className="font-mono mt-0.5 font-semibold tabular-nums text-foreground">
            {fmtBRLCompacto(valor)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
            Duração
          </p>
          <p className="font-mono mt-0.5 text-foreground">
            {form.aluno_duracao} min
          </p>
        </div>
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
            Frequência
          </p>
          <p className="font-mono mt-0.5 text-foreground">Toda semana</p>
        </div>
      </div>
    </div>
  );
};

// ── Confetti ─────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#E7A13A",
  "#F1AF50",
  "#D18F26",
  "#3ECF6B",
  "#5A9DEE",
  "#F5F1EA",
];

const Confetti = () => {
  const ref = useRef<HTMLDivElement>(null);
  // Lazy init pra satisfazer react-hooks/purity: Math.random fica fora do render.
  const [particles] = useState(() =>
    Array.from({ length: 50 }, () => ({
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.2,
      rotate: Math.random() * 360,
      width: 4 + Math.random() * 5,
      height: 8 + Math.random() * 8,
      round: Math.random() > 0.5,
    })),
  );
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden z-20"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="onb-confetti-particle"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            borderRadius: p.round ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
};

export default Onboarding;

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Cria o primeiro aluno + a recorrência dele. As colunas legadas de `alunos`
 * (dia_semana/horario/duracao_minutos) continuam preenchidas por
 * retrocompatibilidade, mas a fonte de verdade é `aulas_recorrentes`.
 *
 * Retorna false (sem lançar) quando falha: o aluno é nice-to-have e não pode
 * travar o acesso ao painel.
 */
async function criarPrimeiroAluno(
  professorId: string,
  form: FormState,
): Promise<boolean> {
  const horario = horarioParaBanco(form.aluno_horario);
  const { data, error } = await supabase
    .from("alunos")
    .insert({
      professor_id: professorId,
      nome: form.aluno_nome.trim(),
      instrumento: form.aluno_instrumento.trim(),
      valor_mensalidade: parseValor(form.aluno_valor),
      dia_semana: form.aluno_dia,
      horario,
      duracao_minutos: form.aluno_duracao,
      status: "ativo",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[Onboarding] erro ao criar primeiro aluno:", error);
    return false;
  }

  const { error: recError } = await supabase.from("aulas_recorrentes").insert({
    aluno_id: (data as { id: string }).id,
    professor_id: professorId,
    dia_semana: form.aluno_dia,
    horario,
    duracao_minutos: form.aluno_duracao,
    ativo: true,
    data_inicio: toDateOnly(new Date()),
  });

  // Aluno já existe; sem a recorrência a agenda cai no fallback das colunas
  // legadas, então não é motivo pra falhar o onboarding.
  if (recError) {
    console.error("[Onboarding] erro ao criar recorrência do aluno:", recError);
  }
  return true;
}

/**
 * Cria a turma inteira vinda da colagem.
 *
 * Mesmo cuidado do import da tela de Alunos: casa o RETURNING por NOME (a
 * ordem não é garantida) e aceita aluno sem horário — quem colou só nome e
 * telefone entra assim mesmo e completa depois.
 */
async function criarAlunosColados(
  professorId: string,
  linhas: AlunoImportRow[],
): Promise<number> {
  if (linhas.length === 0) return 0;

  const registros = linhas.map((r) => {
    const h = r.horarios[0];
    return {
      professor_id: professorId,
      nome: r.nome.trim(),
      instrumento: r.instrumento || "",
      telefone: r.telefone,
      dia_semana: h?.dia_semana ?? 1,
      horario: horarioParaBanco(h?.horario ?? "09:00"),
      duracao_minutos: h?.duracao_minutos ?? 60,
      valor_mensalidade: r.valor_mensalidade,
      status: "ativo",
    };
  });

  const { data, error } = await supabase
    .from("alunos")
    .insert(registros)
    .select("id, nome");

  if (error || !data) {
    console.error("[Onboarding] erro ao criar alunos colados:", error);
    return 0;
  }

  const criados = data as Array<{ id: string; nome: string }>;
  const idPorNome = new Map(criados.map((c) => [c.nome, c.id]));
  const hoje = toDateOnly(new Date());

  const recorrentes = linhas.flatMap((r) => {
    const alunoId = idPorNome.get(r.nome.trim());
    if (!alunoId) return [];
    return r.horarios.map((h) => ({
      aluno_id: alunoId,
      professor_id: professorId,
      dia_semana: h.dia_semana,
      horario: horarioParaBanco(h.horario),
      duracao_minutos: h.duracao_minutos,
      ativo: true,
      data_inicio: hoje,
    }));
  });

  if (recorrentes.length > 0) {
    const { error: recError } = await supabase
      .from("aulas_recorrentes")
      .insert(recorrentes);
    if (recError) {
      console.error("[Onboarding] erro nas recorrências da colagem:", recError);
    }
  }
  return criados.length;
}

async function tryUpdate(
  id: string,
  update: Record<string, unknown>,
): Promise<unknown | null> {
  const { error } = await supabase
    .from("professores")
    .update(update)
    .eq("id", id);
  return error;
}

function isColumnMissing(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42703") return true;
  return !!e.message && /column .* does not exist/i.test(e.message);
}

function extractMissingColumn(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const msg = (err as { message?: string }).message;
  if (!msg) return null;
  const m = msg.match(/column "?([\w_]+)"? .*does not exist/i);
  return m?.[1] ?? null;
}

/**
 * Mensagem pro professor. O detalhe técnico (código, hint do Postgres) vai
 * pro console — ninguém precisa ver "[42703] column ... does not exist".
 */
function mensagemHumana(err: unknown): string {
  if (isColumnMissing(err)) {
    return "Não consegui salvar suas configurações agora. Tente de novo em instantes.";
  }
  const e = err as { message?: string } | null;
  if (e?.message && /network|fetch|timeout/i.test(e.message)) {
    return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
  }
  return "Não consegui salvar agora. Tente de novo — seus dados continuam aqui.";
}
