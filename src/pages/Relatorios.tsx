import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Download,
  MessageSquare,
  Music,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
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
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/shared/KpiCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { SectionCard } from "@/components/shared/SectionCard";
import { Donut, DonutLegend } from "@/components/shared/Donut";
import { HBars } from "@/components/shared/HBars";
import { InsightBox } from "@/components/shared/InsightBox";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { fmtBRLCompacto } from "@/lib/format";
import { nomeDiaSemana } from "@/lib/constants";
import {
  calcFrequencia,
  type FrequenciaAluno,
} from "@/lib/domain/frequencia";
import { useBloqueios, useDiaBloqueado } from "@/hooks/useBloqueios";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Aluno, Aula } from "@/types/supabase";

const getPctColor = (pct: number) => {
  if (pct < 0) return "bg-muted text-muted-foreground";
  if (pct >= 80) return "bg-success/15 text-success";
  if (pct >= 60) return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
};

const getPctBarColor = (pct: number) => {
  if (pct < 0) return "bg-muted-foreground/30";
  if (pct >= 80) return "bg-success";
  if (pct >= 60) return "bg-warning";
  return "bg-destructive";
};

const Relatorios = () => {
  const { data: professor } = useProfessor();
  const { data: recorrentes } = useAulasRecorrentes(professor?.id);
  const { data: bloqueios } = useBloqueios(professor?.id);
  const isDiaBloqueado = useDiaBloqueado(bloqueios);
  const [mesAtual, setMesAtual] = useState(startOfMonth(new Date()));

  const mesLabel = format(mesAtual, "MMMM yyyy", { locale: ptBR });
  const isMesAtual =
    mesAtual.getMonth() === new Date().getMonth() &&
    mesAtual.getFullYear() === new Date().getFullYear();

  usePage("Relatório de frequência", mesLabel, "Análise");

  const { data: alunos } = useQuery({
    queryKey: ["alunos", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("professor_id", professor!.id)
        .order("nome");
      if (error) throw error;
      return data as Aluno[];
    },
    enabled: !!professor,
  });

  // Cobranças pagas no ano (pra top alunos e receita acumulada)
  const { data: cobrancasAno } = useQuery({
    queryKey: ["cobrancas-ano", professor?.id, mesAtual.getFullYear()],
    queryFn: async () => {
      const ano = mesAtual.getFullYear();
      const { data, error } = await supabase
        .from("cobrancas")
        .select("aluno_id, valor, status, alunos(nome)")
        .eq("professor_id", professor!.id)
        .eq("status", "pago")
        .gte("mes_referencia", `${ano}-01-01`)
        .lte("mes_referencia", `${ano}-12-31`);
      if (error) throw error;
      return (data ?? []).map((d) => ({
        aluno_id: d.aluno_id as string,
        valor: Number(d.valor),
        status: d.status as string,
        nome:
          (Array.isArray(d.alunos)
            ? (d.alunos[0] as { nome?: string } | undefined)?.nome
            : (d.alunos as { nome?: string } | null)?.nome) ?? "Aluno",
      }));
    },
    enabled: !!professor,
  });

  const { data: aulas, isLoading: aulasLoading } = useQuery({
    queryKey: [
      "aulas-relatorio",
      professor?.id,
      mesAtual.toISOString(),
    ],
    queryFn: async () => {
      const inicio = startOfMonth(mesAtual).toISOString();
      const fim = endOfMonth(mesAtual).toISOString();
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .gte("data_hora", inicio)
        .lte("data_hora", fim)
        .not("aluno_id", "is", null);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const frequencias = useMemo(() => {
    if (!alunos) return [];
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return calcFrequencia(
      alunos,
      recorrentes ?? [],
      aulas ?? [],
      inicio,
      fim,
      isDiaBloqueado
    ).sort((a, b) => {
      // Menores % primeiro; "sem dados" (-1) vai pro fim
      if (a.presencaPct < 0 && b.presencaPct < 0) return 0;
      if (a.presencaPct < 0) return 1;
      if (b.presencaPct < 0) return -1;
      return a.presencaPct - b.presencaPct;
    });
  }, [alunos, recorrentes, aulas, mesAtual, isDiaBloqueado]);

  const kpis = useMemo(() => {
    const realizadas = frequencias.reduce((s, f) => s + f.realizadas, 0);
    const faltasJ = frequencias.reduce((s, f) => s + f.faltasJustificadas, 0);
    const faltasSA = frequencias.reduce((s, f) => s + f.faltasSemAviso, 0);
    const totalFaltas = faltasJ + faltasSA;
    const consideradas = realizadas + totalFaltas;
    const taxa =
      consideradas > 0 ? Math.round((realizadas / consideradas) * 100) : 0;
    const piorAluno =
      frequencias
        .filter((f) => f.presencaPct >= 0)
        .reduce<FrequenciaAluno | null>((pior, atual) => {
          const faltasAtual = atual.faltasJustificadas + atual.faltasSemAviso;
          if (!pior) return faltasAtual > 0 ? atual : null;
          const faltasPior = pior.faltasJustificadas + pior.faltasSemAviso;
          return faltasAtual > faltasPior ? atual : pior;
        }, null);
    return {
      realizadas,
      totalFaltas,
      taxa,
      piorAluno,
    };
  }, [frequencias]);

  const exportarCSV = () => {
    if (frequencias.length === 0) {
      toast.error("Sem dados pra exportar");
      return;
    }
    const csv = toCSV(
      [
        "Aluno",
        "Instrumento",
        "Previstas",
        "Realizadas",
        "Faltas justificadas",
        "Faltas sem aviso",
        "% Presença",
      ],
      frequencias.map((f) => [
        f.aluno.nome,
        f.aluno.instrumento,
        f.previstas,
        f.realizadas,
        f.faltasJustificadas,
        f.faltasSemAviso,
        f.presencaPct < 0 ? "—" : `${f.presencaPct}%`,
      ])
    );
    downloadCSV(
      `frequencia-${format(mesAtual, "yyyy-MM")}.csv`,
      csv
    );
    toast.success("Relatório exportado!");
  };

  const enviarWhatsApp = (f: FrequenciaAluno) => {
    if (!f.aluno.telefone) {
      toast.error("Aluno sem telefone cadastrado");
      return;
    }
    const totalFaltas = f.faltasJustificadas + f.faltasSemAviso;
    const texto =
      `Olá ${f.aluno.nome.split(" ")[0]}! 👋 Notei que sua frequência ` +
      `em ${mesLabel} ficou em ${f.presencaPct}% (${totalFaltas} falta${totalFaltas !== 1 ? "s" : ""}). ` +
      `Tá tudo bem? Vamos conversar sobre como ajustar nossos encontros? — ${professor?.nome?.split(" ")[0] ?? "Professor"}`;
    openWhatsApp(f.aluno.telefone, texto, {
      professorId: professor?.id,
      alunoId: f.aluno.id,
      tipo: "outro",
    });
  };

  const loading = aulasLoading;

  // Distribuição por instrumento (donut)
  const distribuicao = useMemo(() => {
    if (!alunos) return [] as { label: string; value: number }[];
    const ativos = alunos.filter((a) => a.status === "ativo");
    const counts = new Map<string, number>();
    for (const a of ativos) {
      const k = a.instrumento || "Outros";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [alunos]);
  const totalAtivos = distribuicao.reduce((s, d) => s + d.value, 0);

  // Top alunos por receita (hbars)
  const topAlunos = useMemo(() => {
    if (!cobrancasAno) return [] as { label: string; value: number; displayValue: string }[];
    const map = new Map<string, { nome: string; valor: number }>();
    for (const c of cobrancasAno) {
      const cur = map.get(c.aluno_id) ?? { nome: c.nome, valor: 0 };
      cur.valor += Number(c.valor);
      map.set(c.aluno_id, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
      .map((r) => ({
        label: r.nome.split(" ").slice(0, 2).join(" "),
        value: r.valor,
        displayValue: fmtBRLCompacto(r.valor),
      }));
  }, [cobrancasAno]);

  const receitaAcumuladaAno = (cobrancasAno ?? []).reduce(
    (s, c) => s + Number(c.valor),
    0,
  );

  // Insights derivados
  const insights = useMemo(() => {
    const list: { tone: "primary" | "info" | "success" | "warning" | "danger"; title: string; description: string }[] = [];

    // Dia mais cheio
    if (alunos && (recorrentes?.length ?? 0) > 0) {
      const ativos = alunos.filter((a) => a.status === "ativo");
      const aulasPorDia: Record<number, number> = {};
      for (const a of ativos) {
        const horarios = getHorariosDoAluno(a, recorrentes ?? []);
        for (const h of horarios) {
          aulasPorDia[h.dia_semana] = (aulasPorDia[h.dia_semana] ?? 0) + 1;
        }
      }
      const entries = Object.entries(aulasPorDia).sort(
        (a, b) => b[1] - a[1],
      );
      if (entries.length > 0 && entries[0][1] >= 3) {
        const dia = Number(entries[0][0]);
        list.push({
          tone: "primary",
          title: `${nomeDiaSemana(dia)} é seu dia mais cheio`,
          description: `${entries[0][1]} aulas no mesmo dia. Considere abrir outro dia ou aumentar o intervalo.`,
        });
      }
    }

    // Aluno com mais faltas
    if (kpis.piorAluno) {
      const totalFaltas =
        kpis.piorAluno.faltasJustificadas + kpis.piorAluno.faltasSemAviso;
      list.push({
        tone: "info",
        title: `${kpis.piorAluno.aluno.nome} acumulou ${totalFaltas} falta${totalFaltas !== 1 ? "s" : ""}`,
        description:
          "Talvez seja hora de conversar sobre frequência ou ajustar o horário.",
      });
    }

    // Receita acumulada positiva
    if (receitaAcumuladaAno > 0) {
      list.push({
        tone: "success",
        title: `Receita de ${mesAtual.getFullYear()}: ${fmtBRLCompacto(receitaAcumuladaAno)}`,
        description: `Soma de cobranças pagas até ${mesLabel}. Continue mantendo o ritmo.`,
      });
    }

    return list;
  }, [alunos, recorrentes, kpis.piorAluno, receitaAcumuladaAno, mesAtual, mesLabel]);

  const exportAction = (
    <Button
      variant="outline"
      onClick={exportarCSV}
      disabled={frequencias.length === 0}
      aria-label="Exportar relatório de frequência em CSV"
    >
      <Download className="h-4 w-4 md:mr-1.5" />
      <span className="hidden md:inline">Exportar CSV</span>
    </Button>
  );

  /* Nav de mês: era `md:hidden` — no desktop não dava pra ver mês nenhum
     além do corrente, apesar do subtítulo anunciar o mês. */
  const mesNav = (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMesAtual((m) => subMonths(m, 1))}
        aria-label="Mês anterior"
        title="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 md:flex-none md:min-w-[150px] h-10 md:h-9 px-4 rounded-[10px] bg-card border border-border flex items-center justify-center">
        <span className="text-sm font-semibold capitalize whitespace-nowrap">
          {mesLabel}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMesAtual((m) => addMonths(m, 1))}
        disabled={isMesAtual}
        aria-label="Próximo mês"
        title="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto animate-fade-in-up">
      {/* Mobile header */}
      <PageHeadMobile
        eyebrow="Análise"
        title="Relatórios"
        subtitle={mesLabel}
        actions={exportAction}
        toolbar={mesNav}
      />

      {/* Desktop page-head */}
      <PageHead
        eyebrow={format(mesAtual, "MMMM '·' yyyy", { locale: ptBR })}
        title="Relatórios"
        subtitle="Visão geral da carteira, receita e frequência. Atualizado em tempo real."
        toolbar={mesNav}
        actions={exportAction}
      />

      {/* KPIs 3-col fiel ao handoff */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px] mb-[22px]">
        <KpiCard
          icon={TrendingUp}
          iconTone="ok"
          label="Receita acumulada (ano)"
          value={fmtBRLCompacto(receitaAcumuladaAno)}
          loading={loading}
          hint={`pagas em ${mesAtual.getFullYear()}`}
        />
        <KpiCard
          icon={CheckCircle2}
          iconTone="info"
          label="Frequência média"
          value={
            loading
              ? "—"
              : kpis.realizadas + kpis.totalFaltas === 0
                ? "—"
                : `${kpis.taxa}%`
          }
          loading={loading}
          hint={`${kpis.realizadas} realizada${kpis.realizadas !== 1 ? "s" : ""} · ${kpis.totalFaltas} falta${kpis.totalFaltas !== 1 ? "s" : ""} em ${kpis.realizadas + kpis.totalFaltas} aula${kpis.realizadas + kpis.totalFaltas !== 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={AlertTriangle}
          iconTone={kpis.totalFaltas > 0 ? "warn" : "default"}
          label="Carteira ativa"
          value={totalAtivos}
          loading={loading}
          hint={
            distribuicao.length === 1
              ? "1 instrumento"
              : `${distribuicao.length} instrumentos diferentes`
          }
        />
      </div>

      {/* Grid 1.4fr/1fr: Distribuição + Top alunos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[22px] mb-[22px]">
        <SectionCard
          title="Distribuição por instrumento"
          description={`${totalAtivos} aluno${totalAtivos !== 1 ? "s" : ""} ativo${totalAtivos !== 1 ? "s" : ""}`}
          icon={CheckCircle2}
          iconTone="info"
        >
          {distribuicao.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sem alunos cadastrados ainda.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Donut
                slices={distribuicao}
                centerValue={totalAtivos}
                centerLabel="alunos"
              />
              <DonutLegend slices={distribuicao} />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Maior receita por aluno"
          description={`Top ${topAlunos.length} · acumulado ${mesAtual.getFullYear()}`}
          icon={TrendingUp}
          iconTone="success"
        >
          {topAlunos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma cobrança paga ainda este ano.
            </p>
          ) : (
            <HBars items={topAlunos} />
          )}
        </SectionCard>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-[22px]">
          <SectionCard
            title="Insights"
            description="Sugestões do mês"
            icon={AlertTriangle}
            iconTone="warning"
          >
            <div className="flex flex-col gap-3.5">
              {insights.map((it, i) => (
                <InsightBox
                  key={i}
                  tone={it.tone}
                  title={it.title}
                  description={it.description}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : frequencias.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem alunos ativos"
          description="Cadastre alunos pra começar a acompanhar a frequência."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header desktop */}
          <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px_90px_180px_120px] gap-4 px-6 py-3 border-b border-border bg-secondary/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Aluno</span>
            <span className="text-center">Previstas</span>
            <span className="text-center">Realizadas</span>
            <span className="text-center">Falta just.</span>
            <span className="text-center">Falta s/ aviso</span>
            <span>% Presença</span>
            <span className="text-right">Ação</span>
          </div>

          <div className="divide-y divide-border/50">
            {frequencias.map((f) => {
              const semDados = f.presencaPct < 0;
              const baixaFreq = !semDados && f.presencaPct < 70;
              return (
                <div
                  key={f.aluno.id}
                  className={cn(
                    "flex flex-col md:grid md:grid-cols-[1fr_90px_90px_90px_90px_180px_120px] gap-3 md:gap-4 px-4 md:px-6 py-4 md:items-center transition-colors",
                    baixaFreq && "bg-destructive/5"
                  )}
                >
                  {/* Aluno (avatar + nome + instrumento) */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        baixaFreq ? "bg-destructive/15" : "bg-primary/15"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-bold",
                          baixaFreq ? "text-destructive" : "text-primary"
                        )}
                      >
                        {f.aluno.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{f.aluno.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Music className="h-3 w-3 shrink-0" />
                        {f.aluno.instrumento || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Mobile: stats em linha */}
                  <div className="grid grid-cols-4 gap-2 md:contents text-center text-sm">
                    <div className="md:contents">
                      <p className="md:hidden text-[10px] uppercase tracking-wider text-muted-foreground">
                        Prev.
                      </p>
                      <span className="font-mono tabular-nums">{f.previstas}</span>
                    </div>
                    <div className="md:contents">
                      <p className="md:hidden text-[10px] uppercase tracking-wider text-muted-foreground">
                        Real.
                      </p>
                      <span className="font-mono tabular-nums text-success">
                        {f.realizadas}
                      </span>
                    </div>
                    <div className="md:contents">
                      <p className="md:hidden text-[10px] uppercase tracking-wider text-muted-foreground">
                        F. just.
                      </p>
                      <span className="font-mono tabular-nums text-warning">
                        {f.faltasJustificadas}
                      </span>
                    </div>
                    <div className="md:contents">
                      <p className="md:hidden text-[10px] uppercase tracking-wider text-muted-foreground">
                        F. s/aviso
                      </p>
                      <span className="font-mono tabular-nums text-destructive">
                        {f.faltasSemAviso}
                      </span>
                    </div>
                  </div>

                  {/* % Presença com barra */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            getPctBarColor(f.presencaPct)
                          )}
                          style={{
                            width: `${semDados ? 0 : f.presencaPct}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 tabular-nums",
                        getPctColor(f.presencaPct)
                      )}
                    >
                      {semDados ? "—" : `${f.presencaPct}%`}
                    </span>
                  </div>

                  {/* Ação */}
                  <div className="md:text-right">
                    {baixaFreq && f.aluno.telefone ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enviarWhatsApp(f)}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Conversar
                      </Button>
                    ) : baixaFreq && !f.aluno.telefone ? (
                      <span className="text-[11px] text-muted-foreground">
                        Sem telefone
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback de uso */}
      {!loading && frequencias.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          {frequencias.filter((f) => f.presencaPct >= 0).length} aluno
          {frequencias.filter((f) => f.presencaPct >= 0).length !== 1 ? "s" : ""}{" "}
          com dados ·{" "}
          {frequencias.filter((f) => f.presencaPct < 0).length} sem aulas
          registradas no mês
        </p>
      )}

    </div>
  );
};

export default Relatorios;
