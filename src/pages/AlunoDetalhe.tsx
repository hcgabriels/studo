import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  Cake,
  Clock,
  MessageSquare,
  CalendarPlus,
  Repeat,
  Archive,
  Pencil,
  FileText,
  GraduationCap,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import {
  useAulasRecorrentes,
  getHorariosDoAluno,
} from "@/hooks/useAulasRecorrentes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/shared/SectionCard";
import { ProfileHead } from "@/components/alunos/ProfileHead";
import { invalidateAlunos } from "@/lib/queries";
import { PacotesTab } from "@/components/shared/PacotesTab";
import { ReciboModal } from "@/components/shared/ReciboModal";
import { AlunoForm } from "@/components/shared/AlunoForm";
import { NivelBadge } from "@/components/shared/NivelBadge";
import {
  AlunoStatusBadge,
  AulaStatusBadge,
  FinanceiroStatusBadge,
} from "@/components/shared/StatusBadge";
import { formatPhone } from "@/lib/masks";
import { openWhatsApp, messageTemplates } from "@/lib/whatsapp";
import { getCobrancaStatus } from "@/lib/cobranca";
import { cn } from "@/lib/utils";
import type {
  Aluno,
  Aula,
  Cobranca,
} from "@/types/supabase";
import { yearOfDateOnly } from "@/lib/dates";
import { fmtBRL } from "@/lib/format";
import { nomeDiaSemana } from "@/lib/constants";

const AlunoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: professor } = useProfessor();
  const { data: recorrentes } = useAulasRecorrentes(professor?.id);
  const [reciboCobranca, setReciboCobranca] = useState<Cobranca | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const { data: aluno, isLoading } = useQuery({
    queryKey: ["aluno-detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Aluno;
    },
    enabled: !!id,
  });

  const { data: aulas } = useQuery({
    queryKey: ["aluno-aulas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("aluno_id", id!)
        .order("data_hora", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!id,
  });

  const { data: cobrancas } = useQuery({
    queryKey: ["aluno-cobrancas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*")
        .eq("aluno_id", id!)
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data as Cobranca[];
    },
    enabled: !!id,
  });

  usePage(aluno?.nome ?? "Aluno", aluno?.instrumento ?? "", "Aluno");

  const toggleStatus = useMutation({
    mutationFn: async () => {
      if (!aluno) return;
      const novo = aluno.status === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase
        .from("alunos")
        .update({ status: novo })
        .eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      toast.success("Status atualizado!");
    },
  });

  if (isLoading) {
    return (
      <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <p className="text-muted-foreground">Aluno não encontrado.</p>
        <Link to="/alunos" className="text-primary text-sm hover:underline mt-2 inline-block">
          ← Voltar para a lista
        </Link>
      </div>
    );
  }

  const horarios = getHorariosDoAluno(aluno, recorrentes ?? []);
  const totalPagoAno = (cobrancas ?? [])
    .filter((c) => {
      const ano = yearOfDateOnly(c.mes_referencia);
      return c.status === "pago" && ano === new Date().getFullYear();
    })
    .reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto space-y-6 animate-fade-in-up">
      {/* Voltar */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Profile head — fiel ao handoff (.profile-head) */}
      <ProfileHead
        name={aluno.nome}
        badges={
          <>
            <Badge variant="info" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              {aluno.instrumento || "—"}
            </Badge>
            {aluno.nivel && (
              <Badge variant="secondary" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {aluno.nivel}
              </Badge>
            )}
            <AlunoStatusBadge status={aluno.status as "ativo" | "inativo"} />
          </>
        }
        monoLines={[
          aluno.email_notificacao,
          aluno.telefone ? formatPhone(aluno.telefone) : undefined,
          aluno.data_nascimento
            ? format(parseISO(aluno.data_nascimento), "dd/MM/yyyy")
            : undefined,
        ].filter(Boolean) as string[]}
        stats={[
          {
            label: "Mensalidade",
            value: fmtBRL(Number(aluno.valor_mensalidade)),
            sub: `${aluno.duracao_minutos} min/aula`,
          },
          {
            label: "Aulas no total",
            value: aulas?.length ?? 0,
            sub: `${aulas?.filter((a) => a.status === "realizada").length ?? 0} realizadas · ${aulas?.filter((a) => a.status === "falta_sem_aviso").length ?? 0} faltas`,
          },
          {
            label: "Presença",
            value: (() => {
              const total = aulas?.length ?? 0;
              const ok = aulas?.filter((a) => a.status === "realizada").length ?? 0;
              if (total === 0) return "—";
              return `${Math.round((ok / total) * 100)}%`;
            })(),
            sub:
              aulas && aulas.length > 0
                ? (aulas.filter((a) => a.status === "realizada").length /
                    aulas.length) *
                    100 >=
                  80
                  ? "acima da média"
                  : "abaixo da média"
                : "sem histórico",
            valueTone:
              aulas && aulas.length > 0
                ? (aulas.filter((a) => a.status === "realizada").length /
                    aulas.length) *
                    100 >=
                  80
                  ? "ok"
                  : "default"
                : "default",
          },
          {
            label: "Saldo aberto",
            value: (() => {
              const aberto = (cobrancas ?? [])
                .filter((c) => c.status !== "pago")
                .reduce((s, c) => s + Number(c.valor), 0);
              return fmtBRL(aberto);
            })(),
            sub:
              (cobrancas ?? []).some((c) => c.status !== "pago")
                ? "pendente"
                : "em dia",
          },
        ]}
        actions={
          <>
            {aluno.telefone && (
              <Button
                onClick={() =>
                  openWhatsApp(
                    aluno.telefone!,
                    messageTemplates.saudacao(
                      aluno.nome.split(" ")[0],
                      professor?.nome?.split(" ")[0] ?? "Professor",
                    ),
                    { professorId: professor?.id, alunoId: aluno.id, tipo: "saudacao" },
                  )
                }
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
            <Button
              variant={aluno.status === "ativo" ? "outline" : "default"}
              onClick={() => setConfirmArchive(true)}
            >
              <Archive className="h-4 w-4 mr-1.5" />
              {aluno.status === "ativo" ? "Arquivar" : "Reativar"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Conteúdo principal: tabs */}
        <div className="min-w-0">
          <Tabs defaultValue="aulas">
            <TabsList>
              <TabsTrigger value="aulas" count={aulas?.length}>
                Aulas
              </TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="pacotes">Créditos</TabsTrigger>
            </TabsList>

            <TabsContent value="aulas" className="mt-5">
              {!aulas || aulas.length === 0 ? (
                <SectionCard>
                  <div className="text-center py-8 max-w-md mx-auto">
                    <p className="text-sm font-medium">Sem aulas registradas ainda</p>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Registre presença, anotações e lição de casa pela Agenda.
                      Tudo aparece aqui no histórico do aluno.
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/agenda">
                        <CalendarPlus className="h-4 w-4" />
                        Ir para Agenda
                      </Link>
                    </Button>
                  </div>
                </SectionCard>
              ) : (
                <SectionCard
                  title="Histórico de aulas"
                  description="Presença, anotações e lições registradas na Agenda"
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link to="/agenda">
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Registrar aula
                      </Link>
                    </Button>
                  }
                >
                  <div className="relative">
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                    <div className="space-y-4">
                      {aulas.map((aula) => {
                        const dotColor =
                          aula.status === "realizada"
                            ? "bg-success"
                            : aula.status === "falta_sem_aviso"
                            ? "bg-destructive"
                            : aula.status === "falta_justificada"
                            ? "bg-warning"
                            : aula.status === "cancelada_professor"
                            ? "bg-muted-foreground"
                            : aula.status === "reagendada"
                            ? "bg-secondary"
                            : "bg-primary";
                        return (
                          <div key={aula.id} className="relative pl-6">
                            <div
                              className={cn(
                                "absolute left-0 top-1 h-3.5 w-3.5 rounded-full ring-4 ring-card",
                                dotColor
                              )}
                            />
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-semibold">
                                {format(
                                  new Date(aula.data_hora),
                                  "dd 'de' MMM 'de' yyyy",
                                  { locale: ptBR }
                                )}
                                <span className="text-xs text-muted-foreground font-normal ml-2 font-mono">
                                  {format(new Date(aula.data_hora), "HH:mm")}
                                </span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                {aula.eh_reposicao && (
                                  <Badge variant="success">Reposição</Badge>
                                )}
                                {aula.tipo === "experimental" && (
                                  <Badge variant="warning">Trial</Badge>
                                )}
                                {aula.tipo === "avulsa" && (
                                  <Badge variant="secondary">Extra</Badge>
                                )}
                                <AulaStatusBadge
                                  status={
                                    aula.status as
                                      | "realizada"
                                      | "falta_justificada"
                                      | "falta_sem_aviso"
                                      | "cancelada_professor"
                                      | "agendada"
                                      | "reagendada"
                                  }
                                />
                              </div>
                            </div>
                            {aula.observacao ? (
                              <div className="bg-muted/40 rounded-lg px-3 py-2 mt-1.5">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {aula.observacao}
                                </p>
                              </div>
                            ) : aula.status === "realizada" && !aula.licao_casa ? (
                              <p className="text-xs text-muted-foreground/70 italic mt-1">
                                Sem anotações.
                              </p>
                            ) : null}
                            {aula.licao_casa ? (
                              <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 mt-1.5">
                                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-primary/80 mb-1">
                                  Lição de casa
                                </p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {aula.licao_casa}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            <TabsContent value="financeiro" className="mt-5 space-y-4">
              <div className="bg-primary/10 rounded-xl px-5 py-4">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  Total pago em {new Date().getFullYear()}
                </p>
                <p className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-primary mt-1">
                  {fmtBRL(totalPagoAno)}
                </p>
              </div>

              {!cobrancas || cobrancas.length === 0 ? (
                <SectionCard>
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma cobrança registrada.
                  </p>
                </SectionCard>
              ) : (
                <SectionCard
                  title="Cobranças"
                  description={`${cobrancas.length} registros`}
                >
                  <div className="-mx-1 divide-y divide-border/40">
                    {cobrancas.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-1 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium first-letter:uppercase">
                            {format(
                              new Date(c.mes_referencia + "T00:00:00"),
                              "MMMM yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Venc.{" "}
                            {format(
                              new Date(c.vencimento + "T00:00:00"),
                              "dd/MM/yyyy"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-semibold tabular-nums text-sm">
                            {fmtBRL(Number(c.valor))}
                          </span>
                          <FinanceiroStatusBadge status={getCobrancaStatus(c)} />
                          {c.status === "pago" && (
                            <button
                              onClick={() => setReciboCobranca(c)}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Recibo
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            <TabsContent value="pacotes" className="mt-5">
              {professor && (
                <PacotesTab alunoId={aluno.id} professorId={professor.id} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          {(aluno.nivel || aluno.objetivo) && (
            <SectionCard title="Perfil musical" icon={GraduationCap}>
              <div className="space-y-3">
                {aluno.nivel && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Nível
                    </span>
                    <NivelBadge nivel={aluno.nivel} />
                  </div>
                )}
                {aluno.objetivo && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Objetivo
                    </p>
                    <p className="text-sm leading-relaxed">{aluno.objetivo}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Horários semanais" icon={Clock}>
            <div className="space-y-2">
              {horarios.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {nomeDiaSemana(h.dia_semana)}
                  </span>
                  <span className="text-sm font-mono">
                    {h.horario.slice(0, 5)}{" "}
                    <span className="text-muted-foreground">
                      · {h.duracao_minutos}min
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {aluno.reposicoes_disponiveis > 0 && (
            <SectionCard
              title="Reposições"
              icon={Repeat}
              iconTone="success"
            >
              <p className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-success">
                {aluno.reposicoes_disponiveis}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Reposição{aluno.reposicoes_disponiveis !== 1 ? "ões" : ""} pendente
                {aluno.reposicoes_disponiveis !== 1 ? "s" : ""}
              </p>
            </SectionCard>
          )}

          {aluno.data_nascimento && (
            <SectionCard title="Aniversário" icon={Cake} iconTone="warning">
              <p className="text-sm font-semibold">
                {format(parseISO(aluno.data_nascimento), "dd 'de' MMMM", {
                  locale: ptBR,
                })}
              </p>
            </SectionCard>
          )}

          {aluno.nome_responsavel && (
            <SectionCard title="Responsável">
              <p className="text-sm font-medium">{aluno.nome_responsavel}</p>
            </SectionCard>
          )}

          {aluno.observacoes && (
            <SectionCard title="Observações">
              <p className="text-sm whitespace-pre-wrap">{aluno.observacoes}</p>
            </SectionCard>
          )}

          {aluno.email_notificacao && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{aluno.email_notificacao}</span>
            </div>
          )}
          {aluno.telefone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Phone className="h-3.5 w-3.5" />
              <span className="font-mono">{formatPhone(aluno.telefone)}</span>
            </div>
          )}
        </div>
      </div>

      {professor && reciboCobranca && (
        <ReciboModal
          open={!!reciboCobranca}
          onClose={() => setReciboCobranca(null)}
          cobranca={reciboCobranca}
          alunoNome={aluno.nome}
          professor={professor}
        />
      )}

      {professor && (
        <AlunoForm
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          professorId={professor.id}
          editingAluno={aluno}
          recorrentes={recorrentes ?? []}
        />
      )}

      {/* Confirmação arquivar/reativar */}
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={
          aluno.status === "ativo" ? "Arquivar aluno" : "Reativar aluno"
        }
        description={
          aluno.status === "ativo"
            ? `Tem certeza que deseja arquivar ${aluno.nome}? O aluno não aparecerá mais na agenda, mas o histórico será mantido.`
            : `Deseja reativar ${aluno.nome}?`
        }
        variant={aluno.status === "ativo" ? "destructive" : "default"}
        confirmLabel={aluno.status === "ativo" ? "Arquivar" : "Reativar"}
        loading={toggleStatus.isPending}
        onConfirm={() =>
          toggleStatus.mutate(undefined, {
            onSettled: () => setConfirmArchive(false),
          })
        }
      />
    </div>
  );
};

export default AlunoDetalhe;
