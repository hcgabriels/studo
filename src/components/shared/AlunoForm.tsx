import { useState, useEffect, useRef, type InputHTMLAttributes } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormGrid, Field } from "@/components/shared/FormGrid";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatPhone,
  unformatPhone,
  isValidPhone,
  isValidEmail,
  formatCurrency,
  parseCurrencyInput,
} from "@/lib/masks";
import { getHorariosDoAluno } from "@/hooks/useAulasRecorrentes";
import { invalidateAlunos } from "@/lib/queries";
import { DIAS_SEMANA, INSTRUMENTOS } from "@/lib/constants";
import { toDateOnly } from "@/lib/dates";
import { atalhoSalvarLabel, isAtalhoSalvar } from "@/lib/platform";
import { useFieldControl } from "@/hooks/useFieldControl";
import { cn } from "@/lib/utils";
import type { Aluno, AlunoNivel, AulaRecorrente } from "@/types/supabase";

const NIVEIS: AlunoNivel[] = ["Iniciante", "Intermediário", "Avançado"];

const OBJETIVO_MAX = 150;

const OBSERVACOES_MAX = 200;

const DURACOES = [30, 45, 60, 90];

/** Código do Postgres pra "function does not exist" (migration não rodou). */
const PG_FUNCAO_INEXISTENTE = "42883";

/**
 * Mesmo visual do `<Input>` do design system (altura 38px, `rounded-md`,
 * `bg-card`, borda de campo). Existe porque `<input type="date">` e
 * `<input type="time">` não podem ser trocados pelo Input do ui/ (o browser
 * renderiza controles próprios), e sem isso o formulário tinha três estilos
 * de campo diferentes na mesma tela.
 */
const CampoNativo = ({
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  const field = useFieldControl();
  return (
    <input
      id={field?.id ?? id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(
        "flex h-[38px] w-full min-w-0 rounded-md border border-[hsl(var(--border-field))] bg-background px-3 py-0 text-[13.5px] tracking-tight transition-colors",
        "hover:border-[hsl(var(--border)/0.7)]",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.28)]",
        "aria-[invalid=true]:border-destructive",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
};

export interface HorarioForm {
  dia_semana: string;
  horario: string;
  duracao_minutos: string;
  /** "YYYY-MM-DD" de quando a recorrência começa. "" = ainda não persistido. */
  data_inicio: string;
}

export interface AlunoFormData {
  nome: string;
  instrumento: string;
  nivel: string; // "" | AlunoNivel
  objetivo: string;
  telefone: string;
  email_notificacao: string;
  nome_responsavel: string;
  data_nascimento: string;
  horarios: HorarioForm[];
  valor_mensalidade: string;
  observacoes: string;
}

const emptyHorario = (): HorarioForm => ({
  dia_semana: "1",
  horario: "14:00",
  duracao_minutos: "60",
  data_inicio: "",
});

const emptyForm = (): AlunoFormData => ({
  nome: "",
  instrumento: "",
  nivel: "",
  objetivo: "",
  telefone: "",
  email_notificacao: "",
  nome_responsavel: "",
  data_nascimento: "",
  horarios: [emptyHorario()],
  valor_mensalidade: "",
  observacoes: "",
});

interface AlunoFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<AlunoFormData>;
  professorId: string;
  editingAluno?: Aluno | null;
  recorrentes: AulaRecorrente[];
}

export const AlunoForm = ({
  open,
  onClose,
  initialData,
  professorId,
  editingAluno,
  recorrentes,
}: AlunoFormProps) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<AlunoFormData>(emptyForm());
  const [errors, setErrors] = useState<
    Partial<Record<keyof AlunoFormData, string>>
  >({});
  /** Snapshot do form no momento em que o dialog abriu, pra detectar alterações. */
  const [snapshot, setSnapshot] = useState<string>("");
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const atalho = atalhoSalvarLabel();
  /**
   * Qual aluno já foi hidratado nesta abertura do dialog. Sem isso, qualquer
   * refetch em segundo plano (o `recorrentes` chega por props) re-hidratava o
   * form e apagava o que o professor estava digitando — e ainda zerava o
   * snapshot que detecta alterações não salvas.
   */
  const hidratadoPara = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      hidratadoPara.current = null;
      return;
    }
    const chave = editingAluno?.id ?? "novo";
    if (hidratadoPara.current !== chave) {
      hidratadoPara.current = chave;
      let inicial: AlunoFormData;
      if (editingAluno) {
        const horariosExistentes = getHorariosDoAluno(
          editingAluno,
          recorrentes,
        ).map((h) => ({
          dia_semana: String(h.dia_semana),
          horario: h.horario.slice(0, 5),
          duracao_minutos: String(h.duracao_minutos),
          data_inicio: h.data_inicio ?? "",
        }));
        inicial = {
          nome: editingAluno.nome,
          instrumento: editingAluno.instrumento,
          nivel: editingAluno.nivel ?? "",
          objetivo: editingAluno.objetivo ?? "",
          telefone: editingAluno.telefone
            ? formatPhone(editingAluno.telefone)
            : "",
          email_notificacao: editingAluno.email_notificacao ?? "",
          nome_responsavel: editingAluno.nome_responsavel ?? "",
          data_nascimento: editingAluno.data_nascimento ?? "",
          horarios:
            horariosExistentes.length > 0
              ? horariosExistentes
              : [emptyHorario()],
          valor_mensalidade: String(
            Math.round(Number(editingAluno.valor_mensalidade) * 100),
          ),
          observacoes: editingAluno.observacoes ?? "",
        };
      } else {
        inicial = { ...emptyForm(), ...initialData };
      }
      // Hidrata o form quando o dialog abre (ou troca de aluno em edição).
      setForm(inicial);
      setSnapshot(JSON.stringify(inicial));
      setErrors({});
      setConfirmarDescarte(false);
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open, editingAluno, initialData, recorrentes]);

  const addHorario = () => {
    setForm((f) => ({ ...f, horarios: [...f.horarios, emptyHorario()] }));
  };
  const removeHorario = (index: number) => {
    if (form.horarios.length <= 1) return;
    setForm((f) => ({
      ...f,
      horarios: f.horarios.filter((_, i) => i !== index),
    }));
  };
  const updateHorario = (index: number, patch: Partial<HorarioForm>) => {
    setForm((f) => ({
      ...f,
      horarios: f.horarios.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof AlunoFormData, string>> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório";
    if (!form.instrumento)
      errs.instrumento = "Escolha o instrumento — ele aparece na lista e na agenda";
    if (
      !form.valor_mensalidade ||
      parseCurrencyInput(form.valor_mensalidade) === 0
    )
      errs.valor_mensalidade = "Valor é obrigatório";
    if (form.telefone && !isValidPhone(form.telefone))
      errs.telefone = "Telefone inválido";
    if (form.email_notificacao && !isValidEmail(form.email_notificacao))
      errs.email_notificacao = "Email inválido";
    return errs;
  };

  const mutation = useMutation({
    mutationFn: async (data: Partial<Aluno>) => {
      let alunoId: string;
      if (editingAluno) {
        const { error } = await supabase
          .from("alunos")
          .update(data)
          .eq("id", editingAluno.id);
        if (error) throw error;
        alunoId = editingAluno.id;
      } else {
        const { data: novo, error } = await supabase
          .from("alunos")
          .insert(data)
          .select("id")
          .single();
        if (error) throw error;
        alunoId = (novo as { id: string }).id;
      }

      // Horário novo vale a partir de hoje. Sem `data_inicio` a recorrência
      // retroage e o aluno aparece com aula em toda semana passada.
      const hoje = toDateOnly(new Date());
      const horarios = form.horarios.map((h) => ({
        dia_semana: parseInt(h.dia_semana),
        horario: `${h.horario}:00`,
        duracao_minutos: parseInt(h.duracao_minutos),
        data_inicio: h.data_inicio || hoje,
      }));

      // Transacional: se um horário falhar, nenhum é gravado — e o aluno não
      // fica sem nenhum horário (o delete+insert antigo deixava).
      const { error: errRpc } = await supabase.rpc("salvar_horarios_aluno", {
        p_aluno_id: alunoId,
        p_professor_id: professorId,
        p_horarios: horarios,
      });

      if (errRpc) {
        if (errRpc.code !== PG_FUNCAO_INEXISTENTE) throw errRpc;
        console.warn(
          "[AlunoForm] RPC salvar_horarios_aluno indisponível (migration não rodou). Caindo no delete+insert não transacional.",
          errRpc,
        );
        const { error: errDel } = await supabase
          .from("aulas_recorrentes")
          .delete()
          .eq("aluno_id", alunoId);
        if (errDel) throw errDel;

        if (horarios.length > 0) {
          const { error: errIns } = await supabase
            .from("aulas_recorrentes")
            .insert(
              horarios.map((h) => ({
                ...h,
                aluno_id: alunoId,
                professor_id: professorId,
                ativo: true,
              })),
            );
          if (errIns) throw errIns;
        }
      }
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      qc.invalidateQueries({ queryKey: ["aulas-recorrentes"] });
      toast.success(editingAluno ? "Aluno atualizado!" : "Aluno adicionado!");
      onClose();
    },
    onError: () => toast.error("Erro ao salvar aluno"),
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const primeiro = form.horarios[0];
    const payload: Partial<Aluno> = {
      professor_id: professorId,
      nome: form.nome.trim(),
      instrumento: form.instrumento,
      nivel: (form.nivel as AlunoNivel) || null,
      objetivo: form.objetivo.trim() || null,
      telefone: form.telefone ? unformatPhone(form.telefone) : null,
      email_notificacao: form.email_notificacao || null,
      nome_responsavel: form.nome_responsavel || null,
      data_nascimento: form.data_nascimento || null,
      dia_semana: parseInt(primeiro.dia_semana),
      horario: `${primeiro.horario}:00`,
      duracao_minutos: parseInt(primeiro.duracao_minutos),
      valor_mensalidade: parseCurrencyInput(form.valor_mensalidade) / 100,
      observacoes: form.observacoes || null,
    };
    mutation.mutate(payload);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setForm((f) => ({ ...f, valor_mensalidade: raw }));
  };

  const temAlteracoes = snapshot !== "" && JSON.stringify(form) !== snapshot;

  /** Fecha, mas confirma antes se tem coisa não salva. */
  const handleClose = () => {
    if (temAlteracoes && !mutation.isPending) {
      setConfirmarDescarte(true);
      return;
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isAtalhoSalvar(e)) handleSubmit(e);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent size="xl" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>
              {editingAluno ? "Editar aluno" : "Novo aluno"}
            </DialogTitle>
            <DialogDescription>
              {editingAluno
                ? "Atualize cadastro, horários e cobrança."
                : "Preencha o essencial agora. O restante pode ficar para depois."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-5">
            <form id="aluno-form" onSubmit={handleSubmit}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                  Dados do aluno
                </p>
                <span className="text-[12px] text-muted-foreground">
                  Campos principais
                </span>
              </div>
              <FormGrid cols={1} className="gap-3.5">
                <Field label="Nome completo" error={errors.nome}>
                  <Input
                    id="nome"
                    ref={firstRef}
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    placeholder="Ex: João da Silva"
                  />
                </Field>

                <FormGrid cols={2}>
                  <Field
                    label="Email"
                    error={errors.email_notificacao}
                  >
                    <Input
                      type="email"
                      value={form.email_notificacao}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          email_notificacao: e.target.value,
                        }))
                      }
                      placeholder="aluno@email.com"
                    />
                  </Field>
                  <Field label="WhatsApp" error={errors.telefone}>
                    <Input
                      value={form.telefone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          telefone: formatPhone(e.target.value),
                        }))
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </Field>
                </FormGrid>

                <FormGrid cols={2}>
                  <Field label="Instrumento" error={errors.instrumento}>
                    <Select
                      value={form.instrumento}
                      onValueChange={(v) => {
                        setForm((f) => ({ ...f, instrumento: v }));
                        setErrors((e) => ({ ...e, instrumento: undefined }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
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
                  <Field label="Nível" optional>
                    <Select
                      value={form.nivel}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, nivel: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEIS.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FormGrid>

                <Field
                  label="Objetivo"
                  optional
                  error={errors.objetivo}
                  hint={`${form.objetivo.length}/${OBJETIVO_MAX}`}
                >
                  <Input
                    value={form.objetivo}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        objetivo: e.target.value.slice(0, OBJETIVO_MAX),
                      }))
                    }
                    placeholder="Ex: tocar numa banda, passar no conservatório, hobbysta..."
                  />
                </Field>
              </FormGrid>

              <FormGrid cols={2} className="mt-3.5">
                <Field
                  label="Responsável"
                  optional
                >
                  <Input
                    value={form.nome_responsavel}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nome_responsavel: e.target.value,
                      }))
                    }
                    placeholder="Nome do responsável"
                  />
                </Field>
                <Field label="Data de nascimento" optional>
                  <CampoNativo
                    type="date"
                    value={form.data_nascimento}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, data_nascimento: e.target.value }))
                    }
                    max={format(new Date(), "yyyy-MM-dd")}
                  />
                </Field>
              </FormGrid>

              <div className="border-t border-border my-5" />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-foreground/85">
                      Horários semanais
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Você pode adicionar mais de um por aluno
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addHorario}
                    className="font-mono text-[11px] tracking-[0.08em] uppercase text-primary hover:opacity-80 inline-flex items-center gap-1 transition-opacity"
                  >
                    <Plus className="h-3 w-3" />
                    Novo
                  </button>
                </div>

                <div className="space-y-2.5">
                  {form.horarios.map((h, i) => (
                    <div
                      key={i}
                      /* Mobile (390px): dia ocupa a linha inteira, hora +
                         duração + lixeira dividem a de baixo. A partir de sm
                         volta pra uma linha só. */
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_110px_110px_auto] gap-2 items-center"
                    >
                      <div className="col-span-3 sm:col-span-1 min-w-0">
                        <Select
                          value={h.dia_semana}
                          onValueChange={(v) =>
                            updateHorario(i, { dia_semana: v })
                          }
                        >
                          <SelectTrigger aria-label="Dia da semana">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAS_SEMANA.map((d, di) => (
                              <SelectItem key={di} value={String(di)}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <CampoNativo
                        type="time"
                        aria-label="Horário"
                        value={h.horario}
                        onChange={(e) =>
                          updateHorario(i, { horario: e.target.value })
                        }
                      />
                      <Select
                        value={h.duracao_minutos}
                        onValueChange={(v) =>
                          updateHorario(i, { duracao_minutos: v })
                        }
                      >
                        <SelectTrigger aria-label="Duração">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURACOES.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.horarios.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeHorario(i)}
                          className="h-[38px] w-[38px] shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label="Remover horário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="w-[38px]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border my-5" />

              <Field
                label="Mensalidade"
                hint="Aparece no recibo do aluno"
                error={errors.valor_mensalidade}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    R$
                  </span>
                  <Input
                    className="pl-9 font-mono tabular-nums"
                    value={
                      form.valor_mensalidade
                        ? formatCurrency(
                            parseInt(form.valor_mensalidade || "0"),
                          )
                        : ""
                    }
                    onChange={handleValorChange}
                    placeholder="0,00"
                  />
                </div>
              </Field>

              <Field
                label="Observação interna"
                optional
                error={errors.observacoes}
                hint={`${form.observacoes.length}/${OBSERVACOES_MAX}`}
                className="mt-3.5"
              >
                <Textarea
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      observacoes: e.target.value.slice(0, OBSERVACOES_MAX),
                    }))
                  }
                  placeholder="Ex: prefere terça à noite, indicação da Clara, etc."
                  rows={3}
                  className="resize-none"
                />
              </Field>
            </form>
          </DialogBody>

          <DialogFooter hint={atalho}>
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="aluno-form"
              disabled={!form.nome.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? "Salvando..."
                : editingAluno
                  ? "Atualizar aluno"
                  : "Salvar aluno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmarDescarte}
        onOpenChange={setConfirmarDescarte}
        title="Descartar as alterações?"
        description="Você mudou coisas aqui e ainda não salvou. Se sair agora, essas mudanças se perdem."
        variant="destructive"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setConfirmarDescarte(false);
          onClose();
        }}
      />
    </>
  );
};
