import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Repeat,
  Package,
  Cake,
  CalendarOff,
  Sparkles,
} from "lucide-react";
import {
  addDays,
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  isSameDay,
  parseISO,
  setYear,
  getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/shared/KpiCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingChecklist } from "@/components/shared/OnboardingChecklist";
import { EmptyState } from "@/components/shared/EmptyState";
import { AulaRow } from "@/components/dashboard/AulaRow";
import { DayDivider } from "@/components/dashboard/DayDivider";
import { CobrSummary } from "@/components/dashboard/CobrSummary";
import { CobrRow } from "@/components/dashboard/CobrRow";
import { getCobrancaStatus } from "@/lib/cobranca";
import {
  useAulasRecorrentes,
  getHorariosDoAluno,
} from "@/hooks/useAulasRecorrentes";
import { useBloqueios, useDiaBloqueado } from "@/hooks/useBloqueios";
import { openWhatsApp, messageTemplates } from "@/lib/whatsapp";
import type { Aluno, Aula, Cobranca, AulaRecorrente, PacoteAulas } from "@/types/supabase";
import { parseDateOnly } from "@/lib/dates";
import { fmtBRL, fmtBRLCompacto } from "@/lib/format";

/**
 * Próximas ocorrências recorrentes.
 *
 * Precisa saber de bloqueios e de aulas já registradas: sem isso o Painel
 * listava aula em feriado/férias e aula já marcada como realizada ou
 * reagendada como se ainda fosse acontecer.
 */
const getNextOccurrences = (
  alunos: Aluno[],
  recorrentes: AulaRecorrente[],
  opts: {
    isDiaBloqueado?: (d: Date) => boolean;
    aulasRegistradas?: Aula[];
    days?: number;
  } = {}
) => {
  const { isDiaBloqueado, aulasRegistradas = [], days = 14 } = opts;
  const today = startOfDay(new Date());
  const limit = addDays(today, days);
  const agora = new Date();
  const occurrences: { aluno: Aluno; date: Date }[] = [];

  // Índice das aulas já registradas: aluno + dia → horários ocupados.
  const registradas = new Map<string, Aula[]>();
  for (const a of aulasRegistradas) {
    if (!a.aluno_id) continue;
    const d = new Date(a.data_hora);
    const k = `${a.aluno_id}|${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = registradas.get(k);
    if (arr) arr.push(a);
    else registradas.set(k, [a]);
  }

  for (const aluno of alunos) {
    if (aluno.status !== "ativo") continue;
    for (const h of getHorariosDoAluno(aluno, recorrentes)) {
      const inicio = h.data_inicio ? parseDateOnly(h.data_inicio) : null;
      const [hh, mm] = h.horario.split(":").map(Number);
      for (let i = 0; i < days; i++) {
        const candidate = addDays(today, i);
        if (candidate.getDay() !== h.dia_semana) continue;
        candidate.setHours(hh, mm, 0, 0);
        if (candidate < agora || candidate > limit) continue;
        if (inicio && candidate < inicio) continue;
        if (isDiaBloqueado?.(candidate)) continue;

        // Já tem registro numa janela próxima? Então não está "por vir".
        const k = `${aluno.id}|${candidate.getFullYear()}-${candidate.getMonth()}-${candidate.getDate()}`;
        const jaRegistrada = (registradas.get(k) ?? []).some((a) => {
          if (a.status === "agendada") return false;
          const diff = Math.abs(
            new Date(a.data_hora).getTime() - candidate.getTime(),
          );
          return diff <= 30 * 60 * 1000;
        });
        if (jaRegistrada) continue;

        occurrences.push({ aluno, date: candidate });
      }
    }
  }

  return occurrences
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);
};

/** Saudação de acordo com a hora — antes era "Bom dia" literal, às 23h também. */
const saudacaoDoDia = (d = new Date()): string => {
  const h = d.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: professor, isLoading: profLoading } = useProfessor();
  const { data: recorrentes } = useAulasRecorrentes(professor?.id);
  const { data: bloqueios } = useBloqueios(professor?.id);
  const isDiaBloqueado = useDiaBloqueado(bloqueios);

  const { data: pacotes } = useQuery({
    queryKey: ["pacotes-dashboard", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacotes_aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .eq("status", "ativo");
      if (error) throw error;
      return data as PacoteAulas[];
    },
    enabled: !!professor,
  });

  const { data: trialsDoMes } = useQuery({
    queryKey: ["trials-mes", professor?.id],
    queryFn: async () => {
      const inicio = startOfMonth(new Date()).toISOString();
      const fim = endOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .eq("tipo", "experimental")
        .gte("data_hora", inicio)
        .lte("data_hora", fim);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  usePage(
    `Olá, ${professor?.nome?.split(" ")[0] ?? "Professor"}`,
    "Resumo do seu dia",
    "Painel",
  );

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

  const { data: cobrancas, isLoading: cobrancasLoading } = useQuery({
    queryKey: ["cobrancas-dashboard", professor?.id],
    queryFn: async () => {
      const inicio = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const fim = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*, alunos(nome)")
        .eq("professor_id", professor!.id)
        .gte("mes_referencia", inicio)
        .lte("mes_referencia", fim);
      if (error) throw error;
      return data as (Cobranca & { alunos: { nome: string } })[];
    },
    enabled: !!professor,
  });

  const { data: cobrancasMesAnterior } = useQuery({
    queryKey: ["cobrancas-mes-anterior", professor?.id],
    queryFn: async () => {
      const mesAnterior = subMonths(new Date(), 1);
      const inicio = format(startOfMonth(mesAnterior), "yyyy-MM-dd");
      const fim = format(endOfMonth(mesAnterior), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cobrancas")
        .select("status, valor, vencimento, data_pagamento")
        .eq("professor_id", professor!.id)
        .gte("mes_referencia", inicio)
        .lte("mes_referencia", fim);
      if (error) throw error;
      return data as Pick<Cobranca, "status" | "valor" | "vencimento" | "data_pagamento">[];
    },
    enabled: !!professor,
  });

  const { data: aulasRecentes } = useQuery({
    queryKey: ["aulas-recentes", professor?.id],
    queryFn: async () => {
      const desde = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .gte("data_hora", desde);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const metrics = useMemo(() => {
    const ativos = alunos?.filter((a) => a.status === "ativo") ?? [];
    const receitaPrevista = ativos.reduce(
      (sum, a) => sum + Number(a.valor_mensalidade),
      0
    );
    const recebido =
      cobrancas
        ?.filter((c) => c.status === "pago")
        .reduce((s, c) => s + Number(c.valor), 0) ?? 0;
    const inadimplentes =
      cobrancas?.filter((c) => getCobrancaStatus(c) === "atrasado").length ?? 0;
    // Conta total de slots semanais (suportando múltiplas aulas/aluno)
    const aulasNaSemana = ativos.reduce((sum, aluno) => {
      const horarios = getHorariosDoAluno(aluno, recorrentes ?? []);
      return sum + horarios.length;
    }, 0);

    // Comparação com mês anterior
    const recebidoAnt =
      cobrancasMesAnterior
        ?.filter((c) => c.status === "pago")
        .reduce((s, c) => s + Number(c.valor), 0) ?? 0;
    const inadimplentesAnt =
      cobrancasMesAnterior?.filter((c) => getCobrancaStatus(c) === "atrasado")
        .length ?? 0;

    const pct = (atual: number, anterior: number): number | null => {
      if (!cobrancasMesAnterior) return null;
      if (anterior === 0) return atual === 0 ? 0 : null;
      return ((atual - anterior) / anterior) * 100;
    };

    return {
      ativos: ativos.length,
      aulasNaSemana,
      receitaPrevista,
      recebido,
      inadimplentes,
      deltaRecebido: pct(recebido, recebidoAnt),
      deltaInadimplentes: pct(inadimplentes, inadimplentesAnt),
    };
  }, [alunos, cobrancas, cobrancasMesAnterior, recorrentes]);

  const proximasAulas = useMemo(
    () =>
      getNextOccurrences(alunos ?? [], recorrentes ?? [], {
        isDiaBloqueado,
        aulasRegistradas: aulasRecentes ?? [],
      }),
    [alunos, recorrentes, aulasRecentes, isDiaBloqueado]
  );

  const totalReposicoes = useMemo(
    () =>
      alunos
        ?.filter((a) => a.status === "ativo")
        .reduce((s, a) => s + (a.reposicoes_disponiveis ?? 0), 0) ?? 0,
    [alunos]
  );

  const pacotesStats = useMemo(() => {
    if (!pacotes) return { count: 0, aulasRestantes: 0, valorTotal: 0 };
    return pacotes.reduce(
      (acc, p) => ({
        count: acc.count + 1,
        aulasRestantes:
          acc.aulasRestantes + (p.total_aulas - p.aulas_usadas),
        valorTotal: acc.valorTotal + Number(p.valor_total),
      }),
      { count: 0, aulasRestantes: 0, valorTotal: 0 }
    );
  }, [pacotes]);

  const trialStats = useMemo(() => {
    const total = trialsDoMes?.length ?? 0;
    const convertidos =
      trialsDoMes?.filter((a) => a.aluno_id !== null).length ?? 0;
    const taxa = total > 0 ? Math.round((convertidos / total) * 100) : 0;
    return { total, convertidos, taxa };
  }, [trialsDoMes]);

  const aniversariantes = useMemo(() => {
    if (!alunos) return [];
    const hoje = startOfDay(new Date());
    const limite = addDays(hoje, 14);
    return alunos
      .filter((a) => a.status === "ativo" && a.data_nascimento)
      .map((a) => {
        const nasc = parseISO(a.data_nascimento!);
        const proximoAniv = setYear(nasc, getYear(hoje));
        const proximo =
          proximoAniv < hoje ? setYear(nasc, getYear(hoje) + 1) : proximoAniv;
        return { aluno: a, proximo, idade: getYear(hoje) - getYear(nasc) };
      })
      .filter((it) => it.proximo >= hoje && it.proximo <= limite)
      .sort((a, b) => a.proximo.getTime() - b.proximo.getTime());
  }, [alunos]);

  const bloqueiosProximos = useMemo(() => {
    if (!bloqueios) return [];
    const hoje = startOfDay(new Date());
    const limite = addDays(hoje, 21);
    return bloqueios
      .filter((b) => {
        const d = new Date(b.data + "T00:00:00");
        return d >= hoje && d <= limite;
      })
      .slice(0, 5);
  }, [bloqueios]);

  const cobrancasPendentes = useMemo(
    () => cobrancas?.filter((c) => c.status !== "pago").slice(0, 5) ?? [],
    [cobrancas]
  );

  // Sumário para CobrSummary (3 colunas)
  const cobrSummaryData = useMemo(() => {
    const list = cobrancas ?? [];
    const sum = (filter: (c: typeof list[number]) => boolean) =>
      list.filter(filter).reduce((s, c) => s + Number(c.valor), 0);
    const cnt = (filter: (c: typeof list[number]) => boolean) =>
      list.filter(filter).length;
    const pagas = sum((c) => c.status === "pago");
    const pagasCnt = cnt((c) => c.status === "pago");
    const atrasadas = sum((c) => getCobrancaStatus(c) === "atrasado");
    const atrasadasCnt = cnt((c) => getCobrancaStatus(c) === "atrasado");
    const pendentes = sum(
      (c) => c.status !== "pago" && getCobrancaStatus(c) !== "atrasado",
    );
    const pendentesCnt = cnt(
      (c) => c.status !== "pago" && getCobrancaStatus(c) !== "atrasado",
    );
    return {
      pagas,
      pagasCnt,
      pendentes,
      pendentesCnt,
      atrasadas,
      atrasadasCnt,
    };
  }, [cobrancas]);

  // Agrupa próximas aulas por dia pra render com day-divider
  const proximasAgrupadas = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    type Item = (typeof proximasAulas)[number];
    const groups: { label: string; isToday: boolean; aulas: Item[] }[] = [];
    for (const item of proximasAulas.slice(0, 8)) {
      const d = startOfDay(item.date);
      const isToday = isSameDay(d, today);
      const isTomorrow = isSameDay(d, tomorrow);
      const dayName = format(d, "EEEE", { locale: ptBR });
      const label = isToday
        ? `Hoje · ${dayName}`
        : isTomorrow
          ? `Amanhã · ${dayName}`
          : format(d, "EEEE, dd 'de' MMM", { locale: ptBR });
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.aulas.push(item);
      } else {
        groups.push({ label, isToday, aulas: [item] });
      }
    }
    return groups;
  }, [proximasAulas]);

  const alertas = useMemo(() => {
    if (!alunos || !aulasRecentes || !cobrancas) return [];
    const agora = new Date();
    const h30diasAtras = subDays(agora, 30);
    const h7diasAtras = subDays(agora, 7);
    const h14diasAtras = subDays(agora, 14);

    return alunos
      .filter((a) => a.status === "ativo")
      .map((aluno) => {
        const motivos: string[] = [];

        const faltasSemAviso = aulasRecentes.filter(
          (au) =>
            au.aluno_id === aluno.id &&
            au.status === "falta_sem_aviso" &&
            new Date(au.data_hora) >= h30diasAtras
        ).length;
        if (faltasSemAviso > 2) motivos.push("Faltas sem aviso");

        const cobrancaAtrasada = cobrancas.find(
          (c) =>
            c.aluno_id === aluno.id &&
            getCobrancaStatus(c) === "atrasado" &&
            parseDateOnly(c.vencimento) <= h7diasAtras
        );
        if (cobrancaAtrasada) motivos.push("Cobrança atrasada");

        const temHistorico = aulasRecentes.some(
          (au) => au.aluno_id === aluno.id
        );
        const aulasRecentes14 = aulasRecentes.filter(
          (au) =>
            au.aluno_id === aluno.id &&
            new Date(au.data_hora) >= h14diasAtras
        ).length;
        if (temHistorico && aulasRecentes14 === 0)
          motivos.push("Sem aulas recentes");

        return { aluno, motivos };
      })
      .filter((item) => item.motivos.length > 0);
  }, [alunos, aulasRecentes, cobrancas]);

  const loading = profLoading || alunosLoading;

  const primeiroNome = professor?.nome?.split(" ")[0] ?? "Professor";
  const hoje = new Date();
  const proximaAulaHoje = proximasAgrupadas[0]?.isToday
    ? proximasAgrupadas[0].aulas[0]
    : null;
  const subtitleDesktop = (
    <>
      Você tem{" "}
      <b className="text-foreground font-semibold">
        {proximasAgrupadas[0]?.isToday ? proximasAgrupadas[0].aulas.length : 0}{" "}
        aula{(proximasAgrupadas[0]?.isToday ? proximasAgrupadas[0].aulas.length : 0) !== 1 ? "s" : ""} hoje
      </b>{" "}
      e{" "}
      <b className="text-foreground font-semibold">
        {cobrSummaryData.pendentesCnt + cobrSummaryData.atrasadasCnt} cobrança
        {cobrSummaryData.pendentesCnt + cobrSummaryData.atrasadasCnt !== 1 ? "s" : ""} pendente
        {cobrSummaryData.pendentesCnt + cobrSummaryData.atrasadasCnt !== 1 ? "s" : ""}
      </b>
      .
    </>
  );

  const tarefasHoje = useMemo(() => {
    const totalPendentes =
      cobrSummaryData.pendentesCnt + cobrSummaryData.atrasadasCnt;
    const aulasHoje = proximasAgrupadas[0]?.isToday
      ? proximasAgrupadas[0].aulas.length
      : 0;
    const items: {
      title: string;
      description: string;
      to: string;
      icon: typeof AlertTriangle;
      tone: "default" | "success" | "warning" | "destructive" | "info";
    }[] = [];

    if (!loading && metrics.ativos === 0) {
      items.push({
        title: "Cadastrar ou importar alunos",
        description: "Comece trazendo sua lista para organizar agenda e cobranças.",
        to: "/alunos",
        icon: Users,
        tone: "info",
      });
    }

    if (!cobrancasLoading && cobrancas?.length === 0 && metrics.ativos > 0) {
      items.push({
        title: `Gerar cobranças de ${format(new Date(), "MMMM", { locale: ptBR })}`,
        description: `${metrics.ativos} aluno${metrics.ativos !== 1 ? "s" : ""} ativo${metrics.ativos !== 1 ? "s" : ""} ainda sem cobrança no mês.`,
        to: "/financeiro",
        icon: DollarSign,
        tone: "warning",
      });
    } else if (totalPendentes > 0) {
      items.push({
        title: `${totalPendentes} cobrança${totalPendentes !== 1 ? "s" : ""} para acompanhar`,
        description:
          cobrSummaryData.atrasadasCnt > 0
            ? `${cobrSummaryData.atrasadasCnt} em atraso e ${cobrSummaryData.pendentesCnt} pendente${cobrSummaryData.pendentesCnt !== 1 ? "s" : ""}.`
            : "Prepare lembretes ou marque pagamentos recebidos.",
        to: "/financeiro",
        icon: DollarSign,
        tone: cobrSummaryData.atrasadasCnt > 0 ? "destructive" : "warning",
      });
    }

    if (aulasHoje > 0) {
      items.push({
        title: `${aulasHoje} aula${aulasHoje !== 1 ? "s" : ""} hoje`,
        description: "Abra a agenda para registrar presença, anotações e lição de casa.",
        to: "/agenda",
        icon: Calendar,
        tone: "info",
      });
    } else if (items.length === 0 && proximasAulas.length > 0) {
      const prox = proximasAulas[0];
      items.push({
        title: `Preparar próxima aula de ${prox.aluno.nome.split(" ")[0]}`,
        description: `${format(prox.date, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}. Veja o histórico antes da aula.`,
        to: `/alunos/${prox.aluno.id}`,
        icon: Calendar,
        tone: "default",
      });
    }

    if (alertas.length > 0) {
      items.push({
        title: `${alertas.length} aluno${alertas.length !== 1 ? "s" : ""} precisa${alertas.length !== 1 ? "m" : ""} de atenção`,
        description: "Baixa frequência, cobrança atrasada ou período sem aula recente.",
        to: "/alunos",
        icon: AlertTriangle,
        tone: "destructive",
      });
    }

    return items;
  }, [
    alertas.length,
    cobrSummaryData.atrasadasCnt,
    cobrSummaryData.pendentesCnt,
    cobrancas,
    cobrancasLoading,
    loading,
    metrics.ativos,
    proximasAulas,
    proximasAgrupadas,
  ]);

  const temTarefaUrgente = tarefasHoje.some((t) =>
    ["destructive", "warning"].includes(t.tone),
  );

  const tarefaLabel: Record<(typeof tarefasHoje)[number]["tone"], string> = {
    default: "Sugestão",
    success: "Em ordem",
    warning: "Atenção",
    destructive: "Urgente",
    info: "Próximo",
  };

  const tarefaToneClasses: Record<
    (typeof tarefasHoje)[number]["tone"],
    {
      icon: string;
      badge:
        | "default"
        | "success"
        | "warning"
        | "destructive"
        | "info"
        | "muted";
    }
  > = {
    default: {
      icon: "bg-primary-soft text-primary border-primary-ring",
      badge: "default",
    },
    success: {
      icon: "bg-success-soft text-success border-success/25",
      badge: "success",
    },
    warning: {
      icon: "bg-warning-soft text-warning border-warning/25",
      badge: "warning",
    },
    destructive: {
      icon: "bg-destructive-soft text-destructive border-destructive/25",
      badge: "destructive",
    },
    info: {
      icon: "bg-info-soft text-info border-info/25",
      badge: "info",
    },
  };

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto animate-fade-in-up">
      {/* Desktop page-head */}
      <PageHead
        eyebrow={format(hoje, "EEEE · d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        title={`${saudacaoDoDia()}, ${primeiroNome}.`}
        subtitle={subtitleDesktop}
      />

      {/* Mobile-only header */}
      <PageHeadMobile
        eyebrow="Painel"
        title={`Olá, ${primeiroNome}`}
        subtitle="Resumo do seu dia"
      />

      {/* Configuração inicial */}
      {professor && (
        <div className="mb-6 md:mb-8">
          <OnboardingChecklist professor={professor} alunos={alunos ?? []} />
        </div>
      )}

      {(loading || tarefasHoje.length > 0) && (
        <div className="mb-6 md:mb-8">
          <SectionCard
            title={temTarefaUrgente ? "Para resolver hoje" : "Próximo passo"}
            description={
              temTarefaUrgente
                ? "O que precisa de atenção para manter a gestão em ordem"
                : "Uma ação simples para preparar melhor sua rotina"
            }
            icon={temTarefaUrgente ? AlertTriangle : Sparkles}
            iconTone={temTarefaUrgente ? "warning" : "default"}
            bodyPadding={false}
          >
            {loading ? (
              <div className="p-5 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {tarefasHoje.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={item.to}
                      className="group flex flex-col gap-3 p-[18px] transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span className="flex items-start gap-3.5 min-w-0 flex-1">
                        <span
                          className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${tarefaToneClasses[item.tone].icon}`}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 space-y-1">
                          <Badge variant={tarefaToneClasses[item.tone].badge}>
                            {tarefaLabel[item.tone]}
                          </Badge>
                          <span className="block text-[15px] font-semibold leading-snug">
                            {item.title}
                          </span>
                          <span className="block text-[13px] leading-relaxed text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                      </span>
                      <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12.5px] font-semibold text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary sm:ml-auto">
                        Abrir
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-[18px] mb-6 md:mb-8">
        <KpiCard
          icon={Users}
          label="Alunos ativos"
          value={metrics.ativos}
          loading={loading}
          hint="cadastrados"
        />
        <KpiCard
          icon={Calendar}
          iconTone="info"
          label="Aulas / semana"
          value={metrics.aulasNaSemana}
          loading={loading}
          hint={proximaAulaHoje ? `próxima às ${format(proximaAulaHoje.date, "HH'h'")}` : "recorrentes"}
        />
        <KpiCard
          icon={DollarSign}
          iconTone="warn"
          label="A receber"
          value={fmtBRLCompacto(cobrSummaryData.pendentes + cobrSummaryData.atrasadas)}
          loading={cobrancasLoading}
          hint={`${cobrSummaryData.pendentesCnt} pendente${cobrSummaryData.pendentesCnt !== 1 ? "s" : ""} · ${cobrSummaryData.atrasadasCnt} em atraso`}
        />
        <KpiCard
          icon={TrendingUp}
          iconTone="ok"
          label="Receita do mês"
          value={fmtBRLCompacto(metrics.recebido)}
          loading={loading}
          delta={metrics.deltaRecebido}
          deltaPositiveGood
          hint="vs. mês anterior"
        />
      </div>

      {/* Cards secundários: reposições, créditos, trials, bloqueios */}
      {(totalReposicoes > 0 ||
        pacotesStats.count > 0 ||
        trialStats.total > 0 ||
        bloqueiosProximos.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-[18px] mb-6 md:mb-8">
          {totalReposicoes > 0 && (
            <KpiCard
              icon={Repeat}
              iconTone="ok"
              label="Reposições pendentes"
              value={totalReposicoes}
              hint="aguardando agendar"
              to="/alunos"
            />
          )}
          {pacotesStats.count > 0 && (
            <KpiCard
              icon={Package}
              iconTone="default"
              label="Créditos ativos"
              value={pacotesStats.count}
              hint={`${pacotesStats.aulasRestantes} aulas restantes`}
              to="/alunos"
            />
          )}
          {trialStats.total > 0 && (
            <KpiCard
              icon={Sparkles}
              iconTone="warn"
              label="Trials do mês"
              value={`${trialStats.convertidos}/${trialStats.total}`}
              hint={`${trialStats.taxa}% conversão`}
            />
          )}
          {bloqueiosProximos.length > 0 && (
            <KpiCard
              icon={CalendarOff}
              iconTone="default"
              label="Bloqueios próximos"
              value={bloqueiosProximos.length}
              hint="próximas 3 semanas"
              to="/configuracoes"
            />
          )}
        </div>
      )}

      {/* Aniversariantes */}
      {aniversariantes.length > 0 && (
        <div className="mb-6 md:mb-8">
        <SectionCard
          title="Aniversariantes"
          description="Próximos 14 dias"
          icon={Cake}
          iconTone="warning"
        >
          <div className="-mx-1">
            {aniversariantes.map(({ aluno, proximo, idade }) => {
              const dias = Math.round(
                (proximo.getTime() - startOfDay(new Date()).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const hoje = isSameDay(proximo, new Date());
              return (
                <div
                  key={aluno.id}
                  className="flex items-center gap-3 px-1 py-3 border-b border-border/40 last:border-0"
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      hoje ? "bg-warning/20" : "bg-primary/15"
                    }`}
                  >
                    <Cake
                      className={`h-4 w-4 ${
                        hoje ? "text-warning" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {aluno.nome}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        · {idade + 1} anos
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground first-letter:uppercase">
                      {hoje
                        ? "Hoje! 🎂"
                        : `${format(proximo, "EEEE, dd 'de' MMM", { locale: ptBR })} · em ${dias} dia${dias !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  {aluno.telefone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openWhatsApp(
                          aluno.telefone!,
                          messageTemplates.parabens(
                            aluno.nome.split(" ")[0],
                            professor?.nome?.split(" ")[0] ?? "Professor"
                          ),
                          {
                            professorId: professor?.id,
                            alunoId: aluno.id,
                            tipo: "parabens",
                          }
                        )
                      }
                    >
                      Parabenizar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
        </div>
      )}

      {/* Dashboard grid: aulas (esquerda) + cobranças (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 md:gap-[22px] mb-6 md:mb-8">
        {/* Próximas aulas */}
        <SectionCard
          title="Próximas aulas"
          description={`Hoje, ${format(hoje, "d 'de' MMMM", { locale: ptBR })} · e amanhã`}
          icon={Calendar}
          bodyPadding={false}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/agenda">
                Ver agenda
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          }
        >
          {alunosLoading ? (
            <div className="p-5 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : proximasAgrupadas.length === 0 ? (
            <EmptyState
              tone="muted"
              icon={Calendar}
              title="Sem aulas agendadas"
              description="Nada na agenda dos próximos 14 dias."
            />
          ) : (
            <div className="flex flex-col">
              {proximasAgrupadas.map((group, gi) => (
                <div key={gi}>
                  <DayDivider
                    label={group.label}
                    now={group.isToday ? format(hoje, "HH:mm") : undefined}
                  />
                  {group.aulas.map(({ aluno, date }) => {
                    const minsAte = Math.round(
                      (date.getTime() - hoje.getTime()) / 60000,
                    );
                    const isProxima =
                      group.isToday && minsAte > 0 && minsAte <= 60;
                    return (
                      <AulaRow
                        key={`${aluno.id}-${date.toISOString()}`}
                        hora={format(date, "HH:mm")}
                        duracaoMin={aluno.duracao_minutos ?? 50}
                        nome={aluno.nome}
                        meta={`${aluno.instrumento}${aluno.nivel ? ` · ${aluno.nivel}` : ""}`}
                        status={isProxima ? "info" : "neutral"}
                        statusTitle={
                          isProxima ? `Em ${minsAte} min` : "Agendada"
                        }
                        onClick={() => navigate(`/alunos/${aluno.id}`)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Cobranças do mês */}
        <SectionCard
          title={`Cobranças de ${format(hoje, "MMMM", { locale: ptBR })}`}
          description={
            cobrancas && cobrancas.length > 0
              ? `${cobrancas.length} cobrança${cobrancas.length !== 1 ? "s" : ""} no mês`
              : "Nenhuma cobrança gerada"
          }
          icon={DollarSign}
          iconTone="warning"
          bodyPadding={false}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/financeiro">
                Ver todas
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          }
        >
          {cobrancasLoading ? (
            <div className="p-5 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (cobrancas?.length ?? 0) === 0 ? (
            <EmptyState
              tone="muted"
              icon={DollarSign}
              title="Sem cobranças do mês"
              description="Gere as cobranças com 1 clique pra todos os alunos ativos."
              action={
                <Button asChild size="sm">
                  <Link to="/financeiro">Gerar cobranças</Link>
                </Button>
              }
            />
          ) : cobrancasPendentes.length === 0 ? (
            <EmptyState
              tone="muted"
              icon={DollarSign}
              title="Tudo pago"
              description="Sem cobranças pendentes esse mês — bom trabalho."
            />
          ) : (
            <>
              <CobrSummary
                cols={[
                  {
                    label: "Pagas",
                    value: fmtBRLCompacto(cobrSummaryData.pagas),
                    count: `${cobrSummaryData.pagasCnt} aluno${cobrSummaryData.pagasCnt !== 1 ? "s" : ""}`,
                    tone: "ok",
                  },
                  {
                    label: "Pendentes",
                    value: fmtBRLCompacto(cobrSummaryData.pendentes),
                    count: `${cobrSummaryData.pendentesCnt} aluno${cobrSummaryData.pendentesCnt !== 1 ? "s" : ""}`,
                    tone: "warn",
                  },
                  {
                    label: "Atrasadas",
                    value: fmtBRLCompacto(cobrSummaryData.atrasadas),
                    count: `${cobrSummaryData.atrasadasCnt} aluno${cobrSummaryData.atrasadasCnt !== 1 ? "s" : ""}`,
                    tone: "danger",
                  },
                ]}
              />
              {cobrancasPendentes.map((c) => {
                const st = getCobrancaStatus(c);
                const venc = new Date(c.vencimento + "T00:00:00");
                const dia = format(venc, "dd/MM");
                return (
                  <CobrRow
                    key={c.id}
                    nome={c.alunos?.nome ?? "Aluno"}
                    due={st === "atrasado" ? `venceu ${dia}` : `vence ${dia}`}
                    amt={fmtBRL(Number(c.valor))}
                    status={
                      st === "atrasado"
                        ? "danger"
                        : st === "pendente"
                          ? "warn"
                          : "ok"
                    }
                    statusTitle={
                      st === "atrasado"
                        ? "Atrasada"
                        : st === "pendente"
                          ? "Pendente"
                          : "Paga"
                    }
                  />
                );
              })}
            </>
          )}
        </SectionCard>
      </div>

      {(loading || alertas.length > 0) && (
        <SectionCard
          title="Atenção necessária"
          description="Alunos com pendências ou sinais de baixa frequência"
          icon={AlertTriangle}
          iconTone="destructive"
        >
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="-mx-1">
              {alertas.map(({ aluno, motivos }) => (
                <Link
                  key={aluno.id}
                  to={`/alunos/${aluno.id}`}
                  className="flex items-center gap-3 px-1 py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30"
                >
                  <div className="h-9 w-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs font-semibold text-warning">
                      {aluno.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground">{aluno.instrumento}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {motivos.map((m) => (
                      <Badge key={m} variant="warning">
                        {m}
                      </Badge>
                    ))}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

export default Dashboard;
