import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Music,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Clock,
  Plus,
  Repeat,
  ArrowLeft,
  UserPlus,
  Bell,
  MessageSquare,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  startOfDay,
  format,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatPhone, unformatPhone, parseCurrencyInput, formatCurrency } from "@/lib/masks";
import { openWhatsApp, messageTemplates } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import {
  buildHorasGrid,
  buildSlotsForDay,
  buildWeekSlots,
  grantsReposicao,
  type SlotAula,
} from "@/lib/domain/agenda";
import { INSTRUMENTOS } from "@/lib/constants";
import { SectionCard } from "@/components/shared/SectionCard";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { FormGrid, Field } from "@/components/shared/FormGrid";
import { invalidateAlunos, invalidateAulas } from "@/lib/queries";
import { AgendaMensal } from "@/components/shared/AgendaMensal";
import { AgendaDia } from "@/components/agenda/AgendaDia";
import { useBloqueios } from "@/hooks/useBloqueios";
import { useAulasRecorrentes, nextAulaAfter } from "@/hooks/useAulasRecorrentes";
import { cn } from "@/lib/utils";
import type { Aluno, Aula } from "@/types/supabase";

const DIAS_SEMANA_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SEMANA_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];



const STATUS_OPTIONS = [
  {
    value: "realizada",
    label: "Presente",
    icon: Check,
    color: "text-success",
    bg: "bg-success/10 border-success/30",
  },
  {
    value: "falta_justificada",
    label: "Falta justificada",
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10 border-warning/30",
  },
  {
    value: "falta_sem_aviso",
    label: "Falta sem aviso",
    icon: X,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
  },
] as const;

// Política de faltas: decide se o status concede +1 reposição ao aluno.
// - "falta_justificada" sempre concede.
// - "falta_sem_aviso" concede APENAS se cobrarSemAviso=false (modo flexível).
// Default (null/undefined/true) = modo rigoroso → sem aviso não vira reposição.
/**
 * Soma ou subtrai 1 do saldo de reposições, sem race.
 *
 * O padrão antigo (SELECT o valor → UPDATE valor±1) perdia contagem: com o app
 * aberto no celular e no desktop dentro da janela de cache, os dois liam o
 * mesmo número e gravavam o mesmo resultado. O aluno ganhava aula de graça.
 */
const ajustarReposicao = async (alunoId: string, delta: 1 | -1) => {
  const fn = delta > 0 ? "increment_reposicao" : "decrement_reposicao";
  const { error } = await supabase.rpc(fn, { p_aluno_id: alunoId });
  if (!error) return;

  // Assinatura antiga da RPC (parâmetro `aluno_id_param`).
  if (delta > 0) {
    const { error: errLegado } = await supabase.rpc("increment_reposicao", {
      aluno_id_param: alunoId,
    });
    if (!errLegado) return;
  }

  // Migration ainda não rodou: cai no caminho antigo, sujeito a race.
  console.warn(
    `RPC ${fn} ausente — rode sql/2026-08-lancamento.sql. Usando fallback não-atômico.`,
  );
  const { data: aluno } = await supabase
    .from("alunos")
    .select("reposicoes_disponiveis")
    .eq("id", alunoId)
    .single();
  const atual =
    (aluno as { reposicoes_disponiveis: number } | null)
      ?.reposicoes_disponiveis ?? 0;
  const novo = Math.max(0, atual + delta);
  if (novo === atual) return;
  await supabase
    .from("alunos")
    .update({ reposicoes_disponiveis: novo })
    .eq("id", alunoId);
};

const PresencaModal = ({
  slot,
  onClose,
  onConverterTrial,
}: {
  slot: SlotAula | null;
  onClose: () => void;
  onConverterTrial: (aula: Aula) => void;
}) => {
  const qc = useQueryClient();
  const { data: professor } = useProfessor();
  const { data: recorrentes = [] } = useAulasRecorrentes(professor?.id);
  const [mode, setMode] = useState<"presence" | "reschedule">("presence");
  const [status, setStatus] = useState<string>("");
  const [obs, setObs] = useState("");
  const [licao, setLicao] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const existing = slot?.existingAula;
  const podeSalvarRegistro = Boolean(status);

  const podeEnviarResumo = !!(
    slot?.aluno.id &&
    slot?.aluno.telefone &&
    podeSalvarRegistro &&
    (obs.trim() || licao.trim())
  );

  const handleSendResumo = () => {
    if (!slot || !slot.aluno.id || !slot.aluno.telefone || !professor) return;
    const primeiroNome = (s: string) => s.trim().split(/\s+/)[0];
    const proxima = nextAulaAfter(slot.aluno, recorrentes, slot.date);
    const proximaTxt = proxima
      ? `${format(proxima, "EEEE", { locale: ptBR })} (${format(proxima, "dd/MM")})`
      : null;
    const msg = messageTemplates.resumoAula(
      primeiroNome(slot.aluno.nome),
      format(slot.date, "dd/MM"),
      obs.trim() || null,
      licao.trim() || null,
      proximaTxt,
      primeiroNome(professor.nome),
    );
    // Abre WhatsApp ANTES de salvar pra ficar dentro do gesto do usuário
    // (evita bloqueio de pop-up). O save dispara em seguida.
    openWhatsApp(slot.aluno.telefone, msg, {
      professorId: professor.id,
      alunoId: slot.aluno.id,
      tipo: "resumo_aula",
    });
    mutation.mutate();
  };

  useEffect(() => {
    if (slot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata o modal de presença quando o slot selecionado muda
      setMode("presence");
      setStatus(slot.existingAula?.status ?? "");
      setObs(slot.existingAula?.observacao ?? "");
      setLicao(slot.existingAula?.licao_casa ?? "");
      setNewDate(format(slot.date, "yyyy-MM-dd"));
      setNewTime(format(slot.date, "HH:mm"));
    } else {
      setStatus("");
      setObs("");
      setLicao("");
    }
  }, [slot]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!slot || !professor) return;
      const statusAnterior = existing?.status;
      if (existing) {
        const { error } = await supabase
          .from("aulas")
          .update({ status, observacao: obs || null, licao_casa: licao || null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("aulas").insert({
          aluno_id: slot.aluno.id,
          professor_id: professor.id,
          data_hora: slot.date.toISOString(),
          duracao_minutos: slot.aluno.duracao_minutos,
          status,
          observacao: obs || null,
          licao_casa: licao || null,
        });
        if (error) throw error;
      }

      // Reposição: usa a política configurada do professor pra decidir antes e depois.
      const cobrarSemAviso = professor.cobrar_falta_sem_aviso;
      const grantedBefore = grantsReposicao(statusAnterior, cobrarSemAviso);
      const grantsNow = grantsReposicao(status, cobrarSemAviso);

      // Os dois lados agora usam RPC atômica (UPDATE ... SET x = x ± 1).
      // O read-modify-write antigo perdia contagem quando o app estava aberto
      // em duas telas dentro da janela de cache.
      if (slot.aluno.id && !grantedBefore && grantsNow) {
        await ajustarReposicao(slot.aluno.id, +1);
      }
      if (slot.aluno.id && grantedBefore && !grantsNow) {
        await ajustarReposicao(slot.aluno.id, -1);
      }
    },
    onSuccess: () => {
      invalidateAulas(qc);
      invalidateAlunos(qc);
      track("presenca_marcada", {
        status: status ?? "",
        atualizacao: Boolean(existing),
        com_observacao: Boolean(obs),
        com_licao: Boolean(licao),
      });
      toast.success(existing ? "Presença atualizada!" : "Presença registrada!");
      onClose();
    },
    onError: () => toast.error("Erro ao salvar presença"),
  });

  const reagendarMutation = useMutation({
    mutationFn: async () => {
      if (!slot || !professor || !newDate || !newTime) return;
      const novaData = new Date(`${newDate}T${newTime}:00`);

      // Materializa a aula original quando ela ainda era só um slot virtual,
      // pra não perder o vínculo `reagendada_de`.
      let originalId = existing?.id ?? null;
      if (!originalId) {
        const { data: criada, error } = await supabase
          .from("aulas")
          .insert({
            aluno_id: slot.aluno.id,
            professor_id: professor.id,
            data_hora: slot.date.toISOString(),
            duracao_minutos: slot.aluno.duracao_minutos,
            status: "agendada",
            tipo: "recorrente",
          })
          .select("id")
          .single();
        if (error) throw error;
        originalId = (criada as { id: string }).id;
      }

      // RPC transacional: marcar a original como reagendada e criar a nova
      // precisa ser tudo-ou-nada. Em duas requests, uma falha no meio deixava
      // a aula original marcada e a nova inexistente — a aula sumia.
      const { error: errRpc } = await supabase.rpc("reagendar_aula", {
        p_aula_id: originalId,
        p_professor_id: professor.id,
        p_aluno_id: slot.aluno.id,
        p_nova_data: novaData.toISOString(),
        p_duracao: slot.aluno.duracao_minutos,
      });

      if (errRpc) {
        if (errRpc.code !== "42883") throw errRpc;
        // Migration ainda não rodou: cai no caminho antigo, sem atomicidade.
        console.warn(
          "RPC reagendar_aula ausente — rode sql/2026-08-lancamento.sql. Usando fallback não-transacional.",
        );
        const { error: errUp } = await supabase
          .from("aulas")
          .update({ status: "reagendada" })
          .eq("id", originalId);
        if (errUp) throw errUp;
        const { error: errNova } = await supabase.from("aulas").insert({
          aluno_id: slot.aluno.id,
          professor_id: professor.id,
          data_hora: novaData.toISOString(),
          duracao_minutos: slot.aluno.duracao_minutos,
          status: "agendada",
          tipo: "avulsa",
          reagendada_de: originalId,
        });
        if (errNova) throw errNova;
      }
    },
    onSuccess: () => {
      invalidateAulas(qc);
      toast.success("Aula reagendada!");
      onClose();
    },
    onError: () => toast.error("Erro ao reagendar"),
  });

  if (!slot) return null;

  return (
    <Dialog open={!!slot} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "reschedule" && (
              <button
                onClick={() => setMode("presence")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {mode === "reschedule" ? "Reagendar aula" : "Registrar aula"}
            {mode === "presence" && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                — {slot.aluno.nome}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {mode === "reschedule"
              ? `${slot.aluno.nome} · ${format(slot.date, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
              : format(slot.date, "EEEE, dd 'de' MMMM • HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {/* DialogBody é obrigatório no variant `studoo`: o DialogContent não tem
            padding e é `overflow-hidden`. Sem ele o conteúdo colava nas bordas
            e, em tela baixa, o botão "Registrar" ficava fora do viewport —
            inalcançável. */}
        {mode === "presence" ? (
          <DialogBody className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {slot.aluno.nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {slot.aluno.instrumento} · {format(slot.date, "HH:mm")} ·{" "}
                    {slot.aluno.duracao_minutos} min
                  </p>
                </div>
                {existing ? (
                  <Badge variant="secondary">Já registrada</Badge>
                ) : (
                  <Badge variant="info">Pendente</Badge>
                )}
              </div>
            </div>

            {existing && (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Registro existente</p>
                <p className="font-medium">
                  {STATUS_OPTIONS.find((s) => s.value === existing.status)?.label ??
                    (existing.status === "reagendada" ? "Reagendada" : existing.status)}
                </p>
              </div>
            )}

            {existing?.tipo === "experimental" && (
              <button
                type="button"
                onClick={() => onConverterTrial(existing)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Cadastrar como aluno</p>
                  <p className="text-xs text-muted-foreground">
                    Trial aprovado? Vire este aluno em recorrente.
                  </p>
                </div>
              </button>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">1. Como foi a aula?</p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-sm font-medium",
                        selected
                          ? `${opt.bg} ${opt.color} border-current`
                          : "border-border text-muted-foreground hover:border-border/80"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs text-center leading-tight">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {(() => {
                const grants = grantsReposicao(
                  status,
                  professor?.cobrar_falta_sem_aviso,
                );
                if (status === "falta_justificada") {
                  return (
                    <p className="text-[11px] text-muted-foreground leading-snug pt-0.5">
                      Aluno ganha <span className="text-warning font-medium">+1 reposição</span>. Mensalidade do mês mantida.
                    </p>
                  );
                }
                if (status === "falta_sem_aviso") {
                  return (
                    <p className="text-[11px] text-muted-foreground leading-snug pt-0.5">
                      {grants ? (
                        <>
                          Aluno ganha <span className="text-warning font-medium">+1 reposição</span>. Mensalidade mantida.{" "}
                          <span className="opacity-70">(Política flexível em Ajustes)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-destructive font-medium">Sem reposição.</span> Mensalidade mantida.{" "}
                          <span className="opacity-70">(Política rigorosa em Ajustes)</span>
                        </>
                      )}
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">2. O que foi trabalhado?</p>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex.: levada de baião, leitura rítmica, música nova..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">3. Lição de casa</p>
                <p className="text-[11px] text-muted-foreground">
                  Aparece no resumo enviado ao aluno
                </p>
              </div>
              <Textarea
                value={licao}
                onChange={(e) => setLicao(e.target.value)}
                placeholder="Ex.: praticar 10 min por dia com metrônomo em 70 bpm..."
                rows={2}
              />
            </div>

            <button
              type="button"
              onClick={handleSendResumo}
              disabled={!podeEnviarResumo || mutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-success/40 bg-success/5 text-sm text-success hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success/5 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Salvar e enviar resumo no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("reschedule")}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              <Repeat className="h-4 w-4" />
              <span>Reagendar essa aula pra outra data</span>
            </button>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!podeSalvarRegistro || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending
                  ? "Salvando..."
                  : existing
                  ? "Atualizar"
                  : "Registrar aula"}
              </Button>
            </div>
          </DialogBody>
        ) : (
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A aula original será marcada como{" "}
              <strong className="text-foreground">reagendada</strong> e uma nova aula
              será criada na data abaixo.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nova data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Novo horário</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:border-primary/40"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setMode("presence")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!newDate || !newTime || reagendarMutation.isPending}
                onClick={() => reagendarMutation.mutate()}
              >
                {reagendarMutation.isPending ? "Reagendando..." : "Confirmar reagendamento"}
              </Button>
            </div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ConverterTrialModal = ({
  open,
  onClose,
  aulaExperimental,
}: {
  open: boolean;
  onClose: () => void;
  aulaExperimental: Aula | null;
}) => {
  const qc = useQueryClient();
  const { data: professor } = useProfessor();
  const [nome, setNome] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [diaSemana, setDiaSemana] = useState("1");
  const [horario, setHorario] = useState("14:00");
  const [duracao, setDuracao] = useState("60");
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (open && aulaExperimental) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-preenche o form ao abrir o modal de converter trial
      setNome(aulaExperimental.aluno_experimental_nome ?? "");
      setInstrumento("");
      setTelefone("");
      const auDate = new Date(aulaExperimental.data_hora);
      setDiaSemana(String(auDate.getDay()));
      setHorario(format(auDate, "HH:mm"));
      setDuracao(String(aulaExperimental.duracao_minutos));
      setValor("");
    }
  }, [open, aulaExperimental]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!professor || !aulaExperimental) return;
      // 1. Cria o aluno
      const { data: novo, error: errAluno } = await supabase
        .from("alunos")
        .insert({
          professor_id: professor.id,
          nome: nome.trim(),
          instrumento,
          telefone: telefone ? unformatPhone(telefone) : null,
          dia_semana: parseInt(diaSemana),
          horario: `${horario}:00`,
          duracao_minutos: parseInt(duracao),
          valor_mensalidade: parseCurrencyInput(valor) / 100,
          status: "ativo",
        })
        .select("id")
        .single();
      if (errAluno) throw errAluno;
      const alunoId = (novo as { id: string }).id;

      // 2. Cria entrada em aulas_recorrentes
      const { error: errRec } = await supabase.from("aulas_recorrentes").insert({
        aluno_id: alunoId,
        professor_id: professor.id,
        dia_semana: parseInt(diaSemana),
        horario: `${horario}:00`,
        duracao_minutos: parseInt(duracao),
        ativo: true,
      });
      if (errRec) throw errRec;

      // 3. Atualiza a aula experimental: vincula ao aluno
      const { error: errAula } = await supabase
        .from("aulas")
        .update({
          aluno_id: alunoId,
          tipo: "avulsa",
          aluno_experimental_nome: null,
        })
        .eq("id", aulaExperimental.id);
      if (errAula) throw errAula;
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      invalidateAulas(qc);
      qc.invalidateQueries({ queryKey: ["aulas-recorrentes"] });
      toast.success("Aluno cadastrado e trial convertido!");
      onClose();
    },
    onError: () => toast.error("Erro ao converter trial"),
  });

  const valid = nome.trim() && instrumento && valor && parseCurrencyInput(valor) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar como aluno</DialogTitle>
          <DialogDescription>
            Aula experimental aprovada? Cadastre o aluno e mantenha o histórico.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select value={instrumento} onValueChange={setInstrumento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUMENTOS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Dia recorrente</Label>
              <Select value={diaSemana} onValueChange={setDiaSemana}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map(
                    (d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Select value={duracao} onValueChange={setDuracao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mensalidade</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                className="pl-8"
                value={valor ? formatCurrency(parseInt(valor || "0")) : ""}
                onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
                placeholder="0,00"
              />
            </div>
          </div>

        </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cadastrando..." : "Cadastrar aluno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NovaAulaModal = ({
  open,
  onClose,
  alunos,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  alunos: Aluno[];
  defaultDate?: Date;
}) => {
  const qc = useQueryClient();
  const { data: professor } = useProfessor();

  const [experimental, setExperimental] = useState(false);
  const [ehReposicao, setEhReposicao] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [nomeExperimental, setNomeExperimental] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("14:00");
  const [duracao, setDuracao] = useState("60");

  useEffect(() => {
    if (open) {
      const d = defaultDate ?? new Date();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta defaults do form de Nova aula quando o modal reabre
      setExperimental(false);
      setEhReposicao(false);
      setAlunoId("");
      setNomeExperimental("");
      setData(format(d, "yyyy-MM-dd"));
      setHora("14:00");
      setDuracao("60");
    }
  }, [open, defaultDate]);

  const alunoSelecionado = alunos.find((a) => a.id === alunoId);
  const reposicoesDisponiveis = alunoSelecionado?.reposicoes_disponiveis ?? 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!professor) return;
      const dataHora = new Date(`${data}T${hora}:00`);
      const { error } = await supabase.from("aulas").insert({
        aluno_id: experimental ? null : alunoId,
        professor_id: professor.id,
        data_hora: dataHora.toISOString(),
        duracao_minutos: parseInt(duracao),
        status: "agendada",
        tipo: experimental ? "experimental" : "avulsa",
        aluno_experimental_nome: experimental ? nomeExperimental : null,
        eh_reposicao: !experimental && ehReposicao,
      });
      if (error) throw error;

      // Consome uma reposição, de forma atômica.
      if (!experimental && ehReposicao && alunoId) {
        await ajustarReposicao(alunoId, -1);
      }
    },
    onSuccess: () => {
      invalidateAulas(qc);
      invalidateAlunos(qc);
      toast.success(experimental ? "Aula experimental agendada!" : "Aula avulsa agendada!");
      onClose();
    },
    onError: () => toast.error("Erro ao criar aula"),
  });

  const valid = experimental
    ? nomeExperimental.trim().length > 0 && data && hora
    : alunoId && data && hora;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova aula</DialogTitle>
          <DialogDescription>
            Aula avulsa, extra ou experimental (fora da grade recorrente)
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <FormGrid cols={1} className="gap-3.5">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-border/70 bg-background/45">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Aula experimental</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Aluno novo sem cadastro completo
              </p>
            </div>
            <Switch checked={experimental} onCheckedChange={setExperimental} />
          </div>

          {experimental ? (
            <Field label="Nome do aluno">
              <Input
                value={nomeExperimental}
                onChange={(e) => setNomeExperimental(e.target.value)}
                placeholder="Como vamos chamar?"
                autoFocus
              />
            </Field>
          ) : (
            <>
              <Field label="Aluno">
                <Select value={alunoId} onValueChange={setAlunoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alunos
                      .filter((a) => a.status === "ativo")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome} — {a.instrumento}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>

              {alunoId && reposicoesDisponiveis > 0 && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-success/25 bg-[hsl(var(--success)/0.08)]">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium">
                      Esta é uma reposição?
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {alunoSelecionado?.nome.split(" ")[0]} tem{" "}
                      <strong className="text-success">
                        {reposicoesDisponiveis} reposiç
                        {reposicoesDisponiveis === 1 ? "ão" : "ões"}
                      </strong>{" "}
                      disponíve{reposicoesDisponiveis === 1 ? "l" : "is"}
                    </p>
                  </div>
                  <Switch
                    checked={ehReposicao}
                    onCheckedChange={setEhReposicao}
                  />
                </div>
              )}
            </>
          )}

          <FormGrid cols={3}>
            <Field label="Data">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </Field>
            <Field label="Horário">
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </Field>
            <Field label="Duração">
              <Select value={duracao} onValueChange={setDuracao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
        </FormGrid>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Criando..." : "Criar aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Agenda = () => {
  const { data: professor } = useProfessor();
  const { data: bloqueios } = useBloqueios(professor?.id);
  const { data: recorrentes } = useAulasRecorrentes(professor?.id);
  const qc = useQueryClient();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SlotAula | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [novaAulaOpen, setNovaAulaOpen] = useState(false);
  const [lembretesOpen, setLembretesOpen] = useState(false);
  const [trialParaConverter, setTrialParaConverter] = useState<Aula | null>(null);

  const bloqueiosSet = useMemo(
    () => new Set(bloqueios?.map((b) => b.data) ?? []),
    [bloqueios]
  );
  const bloqueiosMap = useMemo(() => {
    const m = new Map<string, string | null>();
    (bloqueios ?? []).forEach((b) => m.set(b.data, b.motivo));
    return m;
  }, [bloqueios]);
  const isDiaBloqueado = useCallback(
    (d: Date) => bloqueiosSet.has(format(d, "yyyy-MM-dd")),
    [bloqueiosSet],
  );
  const motivoBloqueio = (d: Date) =>
    bloqueiosMap.get(format(d, "yyyy-MM-dd"));

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return weekOffset === 0
      ? base
      : weekOffset > 0
      ? addWeeks(base, weekOffset)
      : subWeeks(base, Math.abs(weekOffset));
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekEnd = useMemo(
    () => endOfWeek(weekStart, { weekStartsOn: 0 }),
    [weekStart],
  );

  // Mês de referência (independente da semana)
  const monthBase = useMemo(() => {
    const base = startOfMonth(new Date());
    return monthOffset === 0
      ? base
      : monthOffset > 0
      ? addMonths(base, monthOffset)
      : subMonths(base, Math.abs(monthOffset));
  }, [monthOffset]);

  // Dia base derivado do offset (zero = hoje)
  const dayBase = useMemo(
    () => addDays(startOfDay(new Date()), dayOffset),
    [dayOffset],
  );

  // Range da query: cobre grid visível (dia, semana ou mês completo + dias adjacentes)
  const queryRange = useMemo(() => {
    if (view === "day") {
      return {
        start: dayBase.toISOString(),
        end: addDays(dayBase, 1).toISOString(),
      };
    }
    if (view === "week") {
      return {
        start: weekStart.toISOString(),
        end: addDays(weekStart, 7).toISOString(),
      };
    }
    return {
      start: startOfWeek(startOfMonth(monthBase), { weekStartsOn: 0 }).toISOString(),
      end: endOfWeek(endOfMonth(monthBase), { weekStartsOn: 0 }).toISOString(),
    };
  }, [view, dayBase, weekStart, monthBase]);

  const { data: alunos, isLoading: alunosLoading } = useQuery({
    queryKey: ["alunos", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("professor_id", professor!.id);
      if (error) throw error;
      return data as Aluno[];
    },
    enabled: !!professor,
  });

  const { data: aulas, isLoading: aulasLoading } = useQuery({
    queryKey: ["aulas-agenda", professor?.id, queryRange.start, queryRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .gte("data_hora", queryRange.start)
        .lt("data_hora", queryRange.end);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const weekSlots = useMemo(() => {
    const all = buildWeekSlots(
      alunos ?? [],
      weekStart,
      aulas ?? [],
      recorrentes ?? []
    );
    return all.filter((s) => !isDiaBloqueado(s.date));
  }, [alunos, weekStart, aulas, recorrentes, bloqueiosSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = alunosLoading || aulasLoading;
  const weekLabel = `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}`;
  const monthLabel = format(monthBase, "MMMM yyyy", { locale: ptBR });
  const dayLabel = format(dayBase, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const headerLabel =
    view === "day" ? dayLabel : view === "week" ? weekLabel : monthLabel;

  usePage("Agenda", headerLabel, "Calendário");

  // Marca que o professor realmente abriu a agenda. O checklist do painel usava
  // "tem aluno ativo" como proxy — o que marcava esse passo sozinho junto com o
  // de cadastrar o primeiro aluno.
  useEffect(() => {
    try {
      window.localStorage.setItem("studoo:visitou-agenda", "1");
      track("agenda_vista");
      window.dispatchEvent(new Event("storage"));
    } catch {
      /* localStorage indisponível (modo privado) — o passo só não marca. */
    }
  }, []);

  // Slots do dia atual (pra view=day)
  const daySlots = useMemo(() => {
    const all = buildSlotsForDay(
      dayBase,
      alunos ?? [],
      aulas ?? [],
      recorrentes ?? [],
    );
    return all
      .filter((s) => !isDiaBloqueado(s.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [dayBase, alunos, aulas, recorrentes, isDiaBloqueado]);

  const handlePrev = () => {
    if (view === "day") setDayOffset((d) => d - 1);
    else if (view === "week") setWeekOffset((w) => w - 1);
    else setMonthOffset((m) => m - 1);
  };
  const handleNext = () => {
    if (view === "day") setDayOffset((d) => d + 1);
    else if (view === "week") setWeekOffset((w) => w + 1);
    else setMonthOffset((m) => m + 1);
  };
  const handleToday = () => {
    setDayOffset(0);
    setWeekOffset(0);
    setMonthOffset(0);
  };

  const resumo = useMemo(() => {
    const total = weekSlots.length;
    const realizadas = weekSlots.filter((s) => s.existingAula?.status === "realizada").length;
    const faltas = weekSlots.filter(
      (s) =>
        s.existingAula?.status === "falta_sem_aviso" ||
        s.existingAula?.status === "falta_justificada"
    ).length;
    const pendentes = total - realizadas - faltas;
    return { total, realizadas, faltas, pendentes };
  }, [weekSlots]);

  const proximas = useMemo(() => {
    const agora = new Date();
    return weekSlots
      .filter((s) => s.date >= agora && !s.existingAula)
      .slice(0, 5);
  }, [weekSlots]);

  // Aulas de HOJE pendentes (sem registro ou ainda agendadas).
  //
  // Precisa de query própria: a query principal cobre só o range da visão
  // aberta, então nas visões "dia" e "mês" o array `aulas` não contém o dia de
  // hoje — e o badge de lembretes acabava contando aulas já realizadas.
  const hojeRange = useMemo(() => {
    const inicio = startOfDay(new Date());
    return { start: inicio.toISOString(), end: addDays(inicio, 1).toISOString() };
  }, []);

  const { data: aulasHoje } = useQuery({
    queryKey: ["aulas-hoje", professor?.id, hojeRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .gte("data_hora", hojeRange.start)
        .lt("data_hora", hojeRange.end);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const aulasDeHoje = useMemo(() => {
    const hoje = startOfDay(new Date());
    if (isDiaBloqueado(hoje)) return [];
    return buildSlotsForDay(hoje, alunos ?? [], aulasHoje ?? [], recorrentes ?? [])
      .filter((s) => !s.existingAula || s.existingAula.status === "agendada")
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [alunos, aulasHoje, recorrentes, isDiaBloqueado]);

  // Slots do mês visível (pra contagem coerente no cabeçalho da visão "mês").
  const monthSlots = useMemo(() => {
    if (view !== "month") return [];
    const inicio = startOfWeek(startOfMonth(monthBase), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(monthBase), { weekStartsOn: 0 });
    const out: SlotAula[] = [];
    for (let d = new Date(inicio); d <= fim; d = addDays(d, 1)) {
      if (isDiaBloqueado(d)) continue;
      out.push(...buildSlotsForDay(d, alunos ?? [], aulas ?? [], recorrentes ?? []));
    }
    return out;
  }, [view, monthBase, alunos, aulas, recorrentes, isDiaBloqueado]);

  // Lembretes já enviados hoje (lookup por aluno_id)
  const { data: lembretesHoje } = useQuery({
    queryKey: ["lembretes-hoje", professor?.id],
    queryFn: async () => {
      const hoje = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("mensagens_enviadas")
        .select("aluno_id, enviada_em")
        .eq("professor_id", professor!.id)
        .eq("tipo", "lembrete_aula")
        .gte("enviada_em", hoje)
        .order("enviada_em", { ascending: false });
      if (error) throw error;
      return data as { aluno_id: string | null; enviada_em: string }[];
    },
    enabled: !!professor,
  });

  const lembretesEnviadosMap = useMemo(() => {
    const map = new Map<string, string>(); // aluno_id → enviada_em (mais recente)
    (lembretesHoje ?? []).forEach((m) => {
      if (m.aluno_id && !map.has(m.aluno_id)) {
        map.set(m.aluno_id, m.enviada_em);
      }
    });
    return map;
  }, [lembretesHoje]);

  const handleAbrirLembretes = () => {
    if (aulasDeHoje.length === 0) {
      toast.info("Nenhuma aula agendada para hoje");
      return;
    }
    setLembretesOpen(true);
  };

  const enviarLembrete = (slot: SlotAula) => {
    if (!slot.aluno.telefone) return;
    void openWhatsApp(
      slot.aluno.telefone,
      messageTemplates.lembreteAulaHoje(
        slot.aluno.nome.split(" ")[0],
        slot.aluno.instrumento || "música",
        format(slot.date, "HH:mm")
      ),
      {
        professorId: professor?.id,
        alunoId: slot.aluno.id || null,
        tipo: "lembrete_aula",
      }
      // Invalida só DEPOIS do insert resolver — antes o refetch saía na mesma
      // tick e o ✓ "Lembrado" nunca aparecia.
    ).then(() => qc.invalidateQueries({ queryKey: ["lembretes-hoje"] }));
  };

  const getStatusBg = (status?: string) => {
    if (!status) return "bg-primary/10 border-primary/25 text-foreground";
    const map: Record<string, string> = {
      realizada: "bg-success/10 border-success/25 text-success",
      falta_sem_aviso: "bg-destructive/10 border-destructive/25 text-destructive",
      falta_justificada: "bg-warning/10 border-warning/25 text-warning",
      cancelada_professor: "bg-muted border-border text-muted-foreground",
    };
    return map[status] ?? "bg-primary/10 border-primary/25";
  };

  const horasGrid = useMemo(() => buildHorasGrid(weekSlots), [weekSlots]);

  // Contagem coerente com a visão aberta. Antes era sempre weekSlots.length,
  // então a visão mensal mostrava o número da semana rotulado como "este mês".
  const slotsDaView =
    view === "day" ? daySlots : view === "week" ? weekSlots : monthSlots;
  const totalAulasView = slotsDaView.length;
  const periodoLabel =
    view === "day" ? "neste dia" : view === "week" ? "esta semana" : "este mês";
  const eyebrowLabel =
    view === "day"
      ? `Dia · ${headerLabel}`
      : view === "week"
        ? `Semana · ${headerLabel}`
        : `Mês · ${headerLabel}`;

  const headActions = (
    <>
      <Button
        variant="outline"
        onClick={handleAbrirLembretes}
        className="relative"
        aria-label="Enviar lembretes via WhatsApp para alunos com aula hoje"
        title="Enviar lembretes via WhatsApp para alunos com aula hoje"
      >
        <Bell className="h-4 w-4 md:mr-1.5" />
        <span className="hidden md:inline">Enviar lembretes</span>
        {aulasDeHoje.length > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full bg-primary-soft text-primary text-[10px] font-bold tabular-nums">
            {aulasDeHoje.length}
          </span>
        )}
      </Button>
      <Button
        onClick={() => setNovaAulaOpen(true)}
        aria-label="Criar nova aula"
      >
        <Plus className="h-4 w-4 md:mr-1.5" />
        <span className="hidden md:inline">Nova aula</span>
      </Button>
    </>
  );

  const headSubtitle = (
    <>
      <b className="text-foreground font-semibold">
        {totalAulasView} aula{totalAulasView !== 1 ? "s" : ""}
      </b>{" "}
      agendada{totalAulasView !== 1 ? "s" : ""} {periodoLabel}
      {aulasDeHoje.length > 0 ? ` · ${aulasDeHoje.length} hoje` : ""}
    </>
  );

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto animate-fade-in-up">
      {/* Mobile-only header — agora com as mesmas ações do desktop */}
      <PageHeadMobile
        eyebrow="Calendário"
        title="Agenda"
        subtitle={headerLabel}
        actions={headActions}
      />

      {/* Desktop page-head */}
      <PageHead
        eyebrow={eyebrowLabel}
        title="Agenda"
        subtitle={headSubtitle}
        actions={headActions}
      />

      {/* Agenda toolbar (.agenda-toolbar fiel ao handoff) */}
      <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3 md:px-[18px] py-[14px] mb-[18px] flex-wrap">
        {/* Nav: prev / next / label / hoje */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePrev}
            title={view === "week" ? "Semana anterior" : "Mês anterior"}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNext}
            title={view === "week" ? "Próxima semana" : "Próximo mês"}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <div className="hidden md:inline-flex items-baseline gap-1.5 px-2 min-w-[220px] text-[16px] font-semibold tracking-[-0.01em]">
            <span className="first-letter:uppercase inline-block">
              {format(
                view === "day"
                  ? dayBase
                  : view === "week"
                    ? weekStart
                    : monthBase,
                view === "day" ? "EEE, dd 'de' MMM" : "MMM yyyy",
                { locale: ptBR },
              )}
            </span>
            {view === "week" && (
              <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
                {format(weekStart, "dd")}–{format(weekEnd, "dd")}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
        </div>

        {/* View switch Studoo style */}
        <div className="inline-flex p-0.5 gap-px rounded-[10px] bg-secondary border border-border ml-auto md:ml-0">
          {(
            [
              { v: "day", label: "Dia" },
              { v: "week", label: "Semana" },
              { v: "month", label: "Mês" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "h-[30px] px-3 rounded-[7px] text-[12.5px] font-medium transition-colors",
                view === v
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6",
          view === "week"
            ? "grid-cols-1 lg:grid-cols-[1fr_280px]"
            : "grid-cols-1"
        )}
      >
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : view === "day" ? (
            <AgendaDia
              dayBase={dayBase}
              slots={daySlots}
              bloqueado={isDiaBloqueado(dayBase)}
              motivo={motivoBloqueio(dayBase) ?? undefined}
              onSlotClick={(slot) => setSelectedSlot(slot)}
            />
          ) : view === "month" ? (
            <AgendaMensal
              monthBase={monthBase}
              alunos={alunos ?? []}
              recorrentes={recorrentes ?? []}
              aulas={aulas ?? []}
              buildSlotsForDay={buildSlotsForDay}
              isDiaBloqueado={isDiaBloqueado}
              motivoBloqueio={motivoBloqueio}
              onDayClick={(d) => setDiaSelecionado(d)}
            />
          ) : (
            <>
              {/* Mobile: lista por dia */}
              <div className="md:hidden space-y-3">
                {weekDays.map((day) => {
                  const daySlots = weekSlots.filter((s) => isSameDay(s.date, day));
                  const today = isToday(day);
                  const bloqueado = isDiaBloqueado(day);
                  const motivo = motivoBloqueio(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "rounded-xl border overflow-hidden",
                        bloqueado
                          ? "border-dashed border-muted-foreground/30 bg-muted/20 opacity-70"
                          : today
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "px-4 py-2.5 flex items-center gap-2",
                          bloqueado ? "bg-muted/40" : today ? "bg-primary/10" : "bg-muted/30"
                        )}
                      >
                        <p className="font-semibold text-sm">
                          {DIAS_SEMANA_FULL[day.getDay()]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(day, "dd/MM")}
                        </p>
                        {bloqueado && (
                          <Badge variant="muted" className="ml-auto">
                            Bloqueado{motivo ? ` · ${motivo}` : ""}
                          </Badge>
                        )}
                        {!bloqueado && today && (
                          <Badge variant="default" className="ml-auto">
                            Hoje
                          </Badge>
                        )}
                      </div>
                      {bloqueado && (
                        <p className="px-4 py-3 text-xs text-muted-foreground italic">
                          Sem aulas neste dia.
                        </p>
                      )}
                      {!bloqueado && (
                        <>
                      {daySlots.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          Sem aulas
                        </p>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {daySlots.map((slot) => {
                            const isReagendada =
                              slot.existingAula?.status === "reagendada";
                            const tipo = slot.existingAula?.tipo;
                            return (
                              <button
                                key={`${slot.aluno.id}-${slot.date.toISOString()}-${slot.existingAula?.id ?? "slot"}`}
                                className={cn(
                                  "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors",
                                  isReagendada && "opacity-50"
                                )}
                                onClick={() => setSelectedSlot(slot)}
                              >
                                <div
                                  className={cn(
                                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                                    tipo === "experimental"
                                      ? "bg-warning/20"
                                      : "bg-primary/20"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "font-mono text-xs font-semibold",
                                      tipo === "experimental"
                                        ? "text-warning"
                                        : "text-primary"
                                    )}
                                  >
                                    {slot.aluno.nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm font-semibold truncate",
                                      isReagendada && "line-through"
                                    )}
                                  >
                                    {slot.aluno.nome}
                                  </p>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Music className="h-3 w-3" />
                                    {slot.aluno.instrumento}
                                    {tipo === "experimental" && (
                                      <Badge variant="warning" className="ml-1">
                                        Trial
                                      </Badge>
                                    )}
                                    {tipo === "avulsa" && (
                                      <Badge variant="secondary" className="ml-1">
                                        {slot.existingAula?.reagendada_de
                                          ? "Reagendada"
                                          : "Extra"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-mono font-medium">
                                    {format(slot.date, "HH:mm")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {slot.existingAula?.duracao_minutos ??
                                      slot.aluno.duracao_minutos}
                                    min
                                  </p>
                                </div>
                                {slot.existingAula && (
                                  <div
                                    className={cn(
                                      "h-2 w-2 rounded-full shrink-0",
                                      slot.existingAula.status === "realizada"
                                        ? "bg-success"
                                        : slot.existingAula.status === "falta_sem_aviso"
                                        ? "bg-destructive"
                                        : slot.existingAula.status === "reagendada"
                                        ? "bg-secondary"
                                        : "bg-warning"
                                    )}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: grid semanal dentro de card */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Header colunas (.col-head Studoo) */}
                    <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-secondary border-b border-border">
                      <div className="border-r border-border" />
                      {weekDays.map((day) => {
                        const bloq = isDiaBloqueado(day);
                        const hoje = isToday(day);
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "flex flex-col gap-0.5 px-2.5 py-3 border-r border-border/40 last:border-r-0",
                              bloq && "bg-muted/30 opacity-60",
                            )}
                            title={bloq ? motivoBloqueio(day) ?? "Bloqueado" : undefined}
                          >
                            <span
                              className={cn(
                                "font-mono text-[10.5px] tracking-[0.12em] uppercase",
                                hoje ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {DIAS_SEMANA_SHORT[day.getDay()]}
                              {hoje && " · hoje"}
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[18px] font-bold tabular-nums leading-none",
                                bloq && "line-through text-muted-foreground",
                                hoje && !bloq && "text-primary",
                                !hoje && !bloq && "text-foreground",
                              )}
                            >
                              {format(day, "dd")}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      {horasGrid.map((hora) => {
                        const rowSlots = weekDays.map((day) =>
                          weekSlots.filter(
                            (s) =>
                              isSameDay(s.date, day) &&
                              s.date.getHours() === hora
                          )
                        );

                        return (
                          <div
                            key={hora}
                            className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border/40 last:border-0 min-h-[64px]"
                          >
                            <div className="flex items-start justify-end pr-1.5 pt-1.5 border-r border-border/40 bg-card">
                              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                                {String(hora).padStart(2, "0")}:00
                              </span>
                            </div>
                            {rowSlots.map((slots, di) => (
                              <div
                                key={di}
                                className={cn(
                                  "border-l border-border/30 p-1 space-y-1",
                                  isToday(weekDays[di]) && "bg-primary/5"
                                )}
                              >
                                {slots.map((slot) => {
                                  const isReagendada =
                                    slot.existingAula?.status === "reagendada";
                                  const tipo = slot.existingAula?.tipo;
                                  return (
                                    <button
                                      key={`${slot.aluno.id}-${slot.date.toISOString()}-${slot.existingAula?.id ?? "slot"}`}
                                      onClick={() => setSelectedSlot(slot)}
                                      className={cn(
                                        "w-full text-left rounded-md px-2 py-1 text-xs border transition-opacity hover:opacity-80",
                                        getStatusBg(slot.existingAula?.status),
                                        isReagendada && "opacity-50 line-through",
                                        tipo === "avulsa" && "border-dashed",
                                        tipo === "experimental" &&
                                          "border-dashed bg-warning/10 border-warning/30 text-warning"
                                      )}
                                      style={{
                                        marginTop:
                                          slot.date.getMinutes() > 0
                                            ? `${(slot.date.getMinutes() / 60) * 56}px`
                                            : undefined,
                                      }}
                                    >
                                      <p className="font-semibold truncate">
                                        {slot.aluno.nome.split(" ")[0]}
                                        {tipo === "experimental" && " ★"}
                                      </p>
                                      <p className="text-[10px] opacity-70 font-mono">
                                        {format(slot.date, "HH:mm")}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Side panel — só na visão semanal */}
        {view === "week" && (
        <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <SectionCard
            title="Visão da semana"
            icon={TrendingUp}
            className="bg-primary/[0.04]"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total", value: resumo.total, color: "text-foreground" },
                { label: "Realizadas", value: resumo.realizadas, color: "text-success" },
                { label: "Pendentes", value: resumo.pendentes, color: "text-muted-foreground" },
                { label: "Faltas", value: resumo.faltas, color: "text-destructive" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "font-mono text-[22px] font-bold tabular-nums tracking-[-0.02em] leading-tight mt-0.5",
                      item.color,
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Próximas aulas" icon={Clock}>
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma aula pendente esta semana.
              </p>
            ) : (
              <div className="space-y-3">
                {proximas.map((slot) => (
                  <button
                    key={`${slot.aluno.id}-${slot.date.toISOString()}`}
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full flex items-center gap-3 text-left hover:bg-accent/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {slot.aluno.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {DIAS_SEMANA_SHORT[slot.date.getDay()]} ·{" "}
                        {format(slot.date, "HH:mm")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
        )}
      </div>

      <PresencaModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onConverterTrial={(aula) => {
          setSelectedSlot(null);
          setTrialParaConverter(aula);
        }}
      />

      <NovaAulaModal
        open={novaAulaOpen}
        onClose={() => setNovaAulaOpen(false)}
        alunos={alunos ?? []}
      />

      <ConverterTrialModal
        open={!!trialParaConverter}
        onClose={() => setTrialParaConverter(null)}
        aulaExperimental={trialParaConverter}
      />

      <Sheet open={lembretesOpen} onOpenChange={setLembretesOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Lembretes de hoje
            </SheetTitle>
            <SheetDescription className="first-letter:uppercase">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} ·{" "}
              {aulasDeHoje.length} aula
              {aulasDeHoje.length !== 1 ? "s" : ""}
              {lembretesEnviadosMap.size > 0 &&
                ` · ${lembretesEnviadosMap.size} lembrado${lembretesEnviadosMap.size !== 1 ? "s" : ""}`}
            </SheetDescription>
          </SheetHeader>

          {aulasDeHoje.some((s) => !s.aluno.telefone) && (
            <div className="bg-muted/40 border border-dashed border-border rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground">
              Alunos sem telefone cadastrado não recebem lembrete. Você pode
              completar o cadastro depois.
            </div>
          )}

          <div className="space-y-2">
            {aulasDeHoje.map((slot) => {
              const semTelefone = !slot.aluno.telefone;
              const enviadoEm = slot.aluno.id
                ? lembretesEnviadosMap.get(slot.aluno.id)
                : undefined;
              const jaLembrado = !!enviadoEm;
              return (
                <div
                  key={`${slot.aluno.id}-${slot.date.toISOString()}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                    jaLembrado
                      ? "border-success/30 bg-success/5"
                      : "border-border"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      jaLembrado ? "bg-success/15" : "bg-primary/15"
                    )}
                  >
                    {jaLembrado ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <span className="font-mono text-sm font-semibold text-primary">
                        {slot.aluno.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {slot.aluno.nome}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Music className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {slot.aluno.instrumento || "—"}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono">
                        {format(slot.date, "HH:mm")}
                      </span>
                    </p>
                  </div>
                  {jaLembrado ? (
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold text-success">
                        Lembrado
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(enviadoEm!), "HH:mm")}
                      </p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => enviarLembrete(slot)}
                      disabled={semTelefone}
                      title={
                        semTelefone
                          ? "Aluno sem telefone cadastrado"
                          : "Enviar WhatsApp"
                      }
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Enviar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet do dia clicado (visão mensal) */}
      <Sheet
        open={!!diaSelecionado}
        onOpenChange={(v) => !v && setDiaSelecionado(null)}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {diaSelecionado &&
            (() => {
              const slotsDoDia = buildSlotsForDay(
                diaSelecionado,
                alunos ?? [],
                aulas ?? [],
                recorrentes ?? []
              );
              const bloqueado = isDiaBloqueado(diaSelecionado);
              const motivo = motivoBloqueio(diaSelecionado);
              return (
                <>
                  <SheetHeader className="mb-5">
                    <SheetTitle className="first-letter:uppercase">
                      {format(diaSelecionado, "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </SheetTitle>
                    <SheetDescription>
                      {bloqueado
                        ? `Dia bloqueado${motivo ? ` · ${motivo}` : ""}`
                        : `${slotsDoDia.length} aula${slotsDoDia.length !== 1 ? "s" : ""}`}
                    </SheetDescription>
                  </SheetHeader>

                  {bloqueado ? (
                    <div className="bg-muted/40 border border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Sem aulas neste dia.
                      </p>
                    </div>
                  ) : slotsDoDia.length === 0 ? (
                    <div className="bg-muted/40 border border-dashed border-border rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma aula recorrente ou avulsa neste dia.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slotsDoDia.map((slot) => {
                        const status = slot.existingAula?.status;
                        const tipo = slot.existingAula?.tipo;
                        return (
                          <button
                            key={`${slot.aluno.id}-${slot.date.toISOString()}-${slot.existingAula?.id ?? "slot"}`}
                            onClick={() => {
                              setDiaSelecionado(null);
                              setSelectedSlot(slot);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border bg-card text-left transition-colors hover:bg-accent/30",
                              status === "reagendada" && "opacity-60"
                            )}
                          >
                            <div
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                tipo === "experimental"
                                  ? "bg-warning/15"
                                  : "bg-primary/15"
                              )}
                            >
                              <span
                                className={cn(
                                  "text-sm font-bold",
                                  tipo === "experimental"
                                    ? "text-warning"
                                    : "text-primary"
                                )}
                              >
                                {slot.aluno.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-semibold truncate",
                                  status === "reagendada" && "line-through"
                                )}
                              >
                                {slot.aluno.nome}
                              </p>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Music className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {slot.aluno.instrumento || "—"}
                                </span>
                                {tipo === "experimental" && (
                                  <Badge variant="warning" className="ml-1">
                                    Trial
                                  </Badge>
                                )}
                                {tipo === "avulsa" && (
                                  <Badge variant="secondary" className="ml-1">
                                    {slot.existingAula?.reagendada_de
                                      ? "Reagendada"
                                      : "Extra"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-mono font-medium">
                                {format(slot.date, "HH:mm")}
                              </p>
                              {status && status !== "agendada" && (
                                <p
                                  className={cn(
                                    "text-[10px] font-medium mt-0.5",
                                    status === "realizada"
                                      ? "text-success"
                                      : status === "falta_sem_aviso"
                                      ? "text-destructive"
                                      : status === "falta_justificada"
                                      ? "text-warning"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {status === "realizada"
                                    ? "Presente"
                                    : status === "falta_sem_aviso"
                                    ? "Falta"
                                    : status === "falta_justificada"
                                    ? "Justificada"
                                    : status === "reagendada"
                                    ? "Reagendada"
                                    : status}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Agenda;
