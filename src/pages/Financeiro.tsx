import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  Check,
  MessageSquare,
  FileText,
  Download,
} from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { openWhatsApp, messageTemplates } from "@/lib/whatsapp";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidateCobrancas } from "@/lib/queries";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDebounced } from "@/hooks/useDebounced";
import { KpiCard } from "@/components/shared/KpiCard";
import { FinanceiroStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { FilterBar, FilterChip } from "@/components/shared/FilterBar";
import { BarsChart, type BarItem } from "@/components/shared/BarsChart";
import { SectionCard } from "@/components/shared/SectionCard";
import { ReciboModal } from "@/components/shared/ReciboModal";
import { getCobrancaStatus } from "@/lib/cobranca";
import { fmtBRL, fmtBRLCompacto } from "@/lib/format";
import { track } from "@/lib/analytics";
import type { Aluno, Cobranca } from "@/types/supabase";

type CobrancaComAluno = Cobranca & {
  alunos: { nome: string; telefone: string | null };
};

const Financeiro = () => {
  const { data: professor } = useProfessor();
  const qc = useQueryClient();
  // `new Date()` no escopo do módulo travava o "mês atual" no momento em que o
  // bundle carregou — aba aberta virando o mês ficava presa no mês antigo.
  const [mesAtual, _setMesAtual] = useState(() => startOfMonth(new Date()));
  const [confirmGerar, setConfirmGerar] = useState(false);
  const [reciboCobranca, setReciboCobranca] = useState<CobrancaComAluno | null>(null);

  // Trocar de mês fecha o ReciboModal (cobrança seria de outro mês).
  const setMesAtual: typeof _setMesAtual = (updater) => {
    setReciboCobranca(null);
    _setMesAtual(updater);
  };
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "pago" | "pendente" | "atrasado">("todos");
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounced(busca, 200);
  const hoje = new Date();
  const isMesAtual =
    mesAtual.getMonth() === hoje.getMonth() &&
    mesAtual.getFullYear() === hoje.getFullYear();

  const mesRef = format(mesAtual, "yyyy-MM-dd");
  const mesLabel = format(mesAtual, "MMMM yyyy", { locale: ptBR });

  usePage("Financeiro", mesLabel, "Cobranças");

  const { data: cobrancas, isLoading } = useQuery({
    queryKey: ["cobrancas", professor?.id, mesRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*, alunos(nome, telefone)")
        .eq("professor_id", professor!.id)
        .eq("mes_referencia", mesRef)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CobrancaComAluno[];
    },
    enabled: !!professor,
  });

  // A chave PRECISA discriminar o filtro. Com `["alunos", professorId]` puro,
  // esta query dividia cache com as telas que buscam TODOS os alunos — quem
  // abrisse /alunos antes daqui via "Gerar N cobranças" contando arquivados,
  // e o upsert criava cobrança de verdade pra aluno arquivado.
  const { data: alunos } = useQuery({
    queryKey: ["alunos", professor?.id, { status: "ativo" }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("professor_id", professor!.id)
        .eq("status", "ativo");
      if (error) throw error;
      return data as Aluno[];
    },
    enabled: !!professor,
  });

  // Cobranças dos últimos 6 meses pra bars-chart.
  const { data: cobrancas6m } = useQuery({
    queryKey: ["cobrancas-6m", professor?.id, mesRef],
    queryFn: async () => {
      const inicio = format(startOfMonth(subMonths(mesAtual, 5)), "yyyy-MM-dd");
      const fim = format(startOfMonth(addMonths(mesAtual, 1)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cobrancas")
        .select("status, valor, mes_referencia")
        .eq("professor_id", professor!.id)
        .gte("mes_referencia", inicio)
        .lt("mes_referencia", fim);
      if (error) throw error;
      return data as {
        status: string;
        valor: number;
        mes_referencia: string;
      }[];
    },
    enabled: !!professor,
  });

  const marcarPagoMutation = useMutation({
    mutationFn: async (cobrancaId: string) => {
      const { error } = await supabase
        .from("cobrancas")
        .update({ status: "pago", data_pagamento: new Date().toISOString() })
        .eq("id", cobrancaId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCobrancas(qc);
      track("cobranca_marcada_paga");
      toast.success("Pagamento registrado!");
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const gerarCobrancasMutation = useMutation({
    mutationFn: async () => {
      if (!alunos || !professor) return;
      const alunosComCobranca = new Set(cobrancas?.map((c) => c.aluno_id) ?? []);
      const alunosSemCobranca = alunos.filter((a) => !alunosComCobranca.has(a.id));

      if (alunosSemCobranca.length === 0) {
        throw new Error("Todas as cobranças deste mês já foram geradas");
      }

      // Dia de vencimento configurável em Ajustes (default 10). Era fixo no 10,
      // o que travava quem cobra dia 5. Clampa no último dia do mês pra não
      // virar o mês seguinte em fevereiro.
      const ultimoDia = new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth() + 1,
        0,
      ).getDate();
      const diaVenc = Math.min(
        Math.max(professor.dia_vencimento ?? 10, 1),
        ultimoDia,
      );
      const vencimento = format(
        new Date(mesAtual.getFullYear(), mesAtual.getMonth(), diaVenc),
        "yyyy-MM-dd"
      );

      const registros = alunosSemCobranca.map((a) => ({
        professor_id: professor.id,
        aluno_id: a.id,
        valor: Number(a.valor_mensalidade),
        mes_referencia: mesRef,
        vencimento,
        status: "pendente",
      }));

      const { error } = await supabase
        .from("cobrancas")
        .upsert(registros, { onConflict: "aluno_id,mes_referencia" });
      if (error) throw error;

      return alunosSemCobranca.length;
    },
    onSuccess: (count) => {
      invalidateCobrancas(qc);
      track("cobrancas_geradas", { quantidade: count ?? 0, valor_total: valorTotalGerar });
      toast.success(`${count} cobrança${count !== 1 ? "s" : ""} gerada${count !== 1 ? "s" : ""}!`);
      setConfirmGerar(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmGerar(false);
    },
  });

  const alunosSemCobranca = useMemo(() => {
    if (!alunos) return [];
    const com = new Set(cobrancas?.map((c) => c.aluno_id) ?? []);
    return alunos.filter((a) => !com.has(a.id));
  }, [alunos, cobrancas]);
  const valorTotalGerar = alunosSemCobranca.reduce(
    (s, a) => s + Number(a.valor_mensalidade),
    0
  );

  const metrics = useMemo(() => {
    if (!cobrancas)
      return { prevista: 0, recebido: 0, aReceber: 0, inadimplentes: 0 };
    const prevista = isMesAtual
      ? (alunos ?? []).reduce((s, a) => s + Number(a.valor_mensalidade), 0)
      : cobrancas.reduce((s, c) => s + Number(c.valor), 0);
    const recebido = cobrancas
      .filter((c) => c.status === "pago")
      .reduce((s, c) => s + Number(c.valor), 0);
    const inadimplentes = cobrancas.filter((c) => getCobrancaStatus(c) === "atrasado").length;
    return { prevista, recebido, aReceber: prevista - recebido, inadimplentes };
  }, [cobrancas, alunos, isMesAtual]);

  const taxaCobranca =
    metrics.prevista > 0 ? Math.round((metrics.recebido / metrics.prevista) * 100) : 0;

  // Bars chart 6 meses
  const barsData: BarItem[] = useMemo(() => {
    const out: BarItem[] = [];
    for (let i = 5; i >= 0; i--) {
      const mes = startOfMonth(subMonths(mesAtual, i));
      const key = format(mes, "yyyy-MM-dd");
      const itens = (cobrancas6m ?? []).filter(
        (c) => format(new Date(c.mes_referencia + "T00:00:00"), "yyyy-MM-dd") === key,
      );
      const recebido = itens
        .filter((c) => c.status === "pago")
        .reduce((s, c) => s + Number(c.valor), 0);
      out.push({
        label: format(mes, "MMM", { locale: ptBR }).replace(".", ""),
        value: recebido,
        displayValue: fmtBRLCompacto(recebido),
        active: i === 0,
      });
    }
    return out;
  }, [cobrancas6m, mesAtual]);

  const total6m = barsData.reduce((s, b) => s + b.value, 0);

  const cobrancasFiltradas = useMemo(() => {
    if (!cobrancas) return [];
    const q = buscaDebounced.toLowerCase().trim();
    return cobrancas.filter((c) => {
      const status = getCobrancaStatus(c);
      if (statusFiltro !== "todos" && status !== statusFiltro) return false;
      if (!q) return true;
      return c.alunos?.nome.toLowerCase().includes(q);
    });
  }, [cobrancas, statusFiltro, buscaDebounced]);

  const exportarCsv = () => {
    if (!cobrancas) return;
    const csv = toCSV(
      ["Aluno", "Valor", "Vencimento", "Status", "Data pagamento"],
      cobrancas.map((c) => [
        c.alunos?.nome ?? "",
        Number(c.valor).toFixed(2).replace(".", ","),
        format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yyyy"),
        getCobrancaStatus(c),
        c.data_pagamento
          ? format(new Date(c.data_pagamento), "dd/MM/yyyy")
          : "",
      ]),
    );
    downloadCSV(`cobrancas-${mesRef}.csv`, csv);
    toast.success("Cobranças exportadas!");
  };

  const pagasCount = cobrancas?.filter((c) => c.status === "pago").length ?? 0;
  const pendentesCount =
    cobrancas?.filter(
      (c) => c.status !== "pago" && getCobrancaStatus(c) !== "atrasado",
    ).length ?? 0;
  const atrasadasCount =
    cobrancas?.filter((c) => getCobrancaStatus(c) === "atrasado").length ?? 0;

  const tudoGerado = alunosSemCobranca.length === 0;

  const headActions = (
    <>
      {cobrancas && cobrancas.length > 0 && (
        <Button
          variant="outline"
          onClick={exportarCsv}
          aria-label="Exportar cobranças do mês em CSV"
        >
          <Download className="h-4 w-4 md:mr-1.5" />
          <span className="hidden md:inline">Exportar</span>
        </Button>
      )}
      {/* Antes o botão virava "Tudo gerado" desabilitado — botão disabled como
          indicador de estado parece bug. Agora vira confirmação positiva. */}
      {tudoGerado ? (
        <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-success-soft text-success text-[12.5px] font-medium whitespace-nowrap">
          <Check className="h-3.5 w-3.5" />
          Tudo gerado
        </span>
      ) : (
        <Button
          onClick={() => setConfirmGerar(true)}
          disabled={gerarCobrancasMutation.isPending}
          aria-label={`Gerar ${alunosSemCobranca.length} cobranças do mês`}
        >
          <Plus className="h-4 w-4 md:mr-1.5" />
          <span className="hidden md:inline">
            Gerar {alunosSemCobranca.length} cobrança
            {alunosSemCobranca.length !== 1 ? "s" : ""}
          </span>
          <span className="md:hidden tabular-nums">
            {alunosSemCobranca.length}
          </span>
        </Button>
      )}
    </>
  );

  /* Nav de mês: era `md:hidden`, então no desktop o professor ficava preso no
     mês corrente e não conseguia fechar o mês anterior. */
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
      {/* Mobile header — com as mesmas ações do desktop */}
      <PageHeadMobile
        eyebrow="Cobranças"
        title="Financeiro"
        subtitle={mesLabel}
        actions={headActions}
        toolbar={mesNav}
      />

      {/* Desktop page-head */}
      <PageHead
        eyebrow={format(mesAtual, "MMM '·' yyyy", { locale: ptBR })}
        title="Financeiro"
        subtitle={
          cobrancas && cobrancas.length > 0 ? (
            <>
              {cobrancas.length} cobrança{cobrancas.length !== 1 ? "s" : ""} no
              mês · {pagasCount} pagas, {pendentesCount} pendentes
              {atrasadasCount > 0 && `, ${atrasadasCount} atrasada${atrasadasCount !== 1 ? "s" : ""}`}
            </>
          ) : (
            "Nenhuma cobrança gerada neste mês"
          )
        }
        toolbar={mesNav}
        actions={headActions}
      />

      <ConfirmDialog
        open={confirmGerar}
        onOpenChange={setConfirmGerar}
        title="Gerar cobranças do mês?"
        description={
          <>
            Serão criadas <strong>{alunosSemCobranca.length}</strong> cobrança
            {alunosSemCobranca.length !== 1 ? "s" : ""} para{" "}
            <span className="first-letter:uppercase inline-block">{mesLabel}</span>, totalizando{" "}
            <strong>{fmtBRL(valorTotalGerar)}</strong>. Vencimento padrão: dia 10.
          </>
        }
        confirmLabel="Confirmar"
        loadingLabel="Gerando…"
        loading={gerarCobrancasMutation.isPending}
        onConfirm={() => gerarCobrancasMutation.mutate()}
      />

      {/* KPIs 3-col (handoff) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px] mb-[22px]">
        <KpiCard
          icon={TrendingUp}
          iconTone="ok"
          label="Recebido no mês"
          value={fmtBRL(metrics.recebido)}
          loading={isLoading}
          hint={`${pagasCount} cobrança${pagasCount !== 1 ? "s" : ""} · ${taxaCobranca}% do previsto`}
        />
        <KpiCard
          icon={Clock}
          iconTone="warn"
          label="A receber"
          value={fmtBRL(metrics.aReceber)}
          loading={isLoading}
          hint={
            pendentesCount > 0
              ? `${pendentesCount} aluno${pendentesCount !== 1 ? "s" : ""} pendente${pendentesCount !== 1 ? "s" : ""}`
              : "nada pendente"
          }
        />
        <KpiCard
          icon={AlertTriangle}
          iconTone="danger"
          label="Em atraso"
          value={
            atrasadasCount > 0
              ? fmtBRL(
                  cobrancas
                    ?.filter((c) => getCobrancaStatus(c) === "atrasado")
                    .reduce((s, c) => s + Number(c.valor), 0) ?? 0,
                )
              : "R$ 0"
          }
          loading={isLoading}
          hint={
            atrasadasCount > 0
              ? `${atrasadasCount} aluno${atrasadasCount !== 1 ? "s" : ""}`
              : "tudo em dia"
          }
        />
      </div>

      {/* Bars chart 6 meses */}
      {(cobrancas6m?.length ?? 0) > 0 && (
        <div className="mb-[22px]">
          <SectionCard
            title="Receita últimos 6 meses"
            description={`Total ${fmtBRL(total6m)} pago no período`}
            icon={TrendingUp}
            iconTone="success"
          >
            <BarsChart items={barsData} height={180} />
          </SectionCard>
        </div>
      )}

      {/* Filtros */}
      {cobrancas && cobrancas.length > 0 && (
        <FilterBar
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar por aluno…"
          chips={
            <>
              <FilterChip
                label="Todas"
                value={String(cobrancas.length)}
                active={statusFiltro === "todos"}
                onClick={() => setStatusFiltro("todos")}
              />
              <FilterChip
                label="Pagas"
                value={String(pagasCount)}
                active={statusFiltro === "pago"}
                onClick={() => setStatusFiltro("pago")}
              />
              <FilterChip
                label="Pendentes"
                value={String(pendentesCount)}
                active={statusFiltro === "pendente"}
                onClick={() => setStatusFiltro("pendente")}
              />
              <FilterChip
                label="Atrasadas"
                value={String(atrasadasCount)}
                active={statusFiltro === "atrasado"}
                onClick={() => setStatusFiltro("atrasado")}
              />
            </>
          }
        />
      )}

      {/* Cobranças */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_140px_140px_140px_120px] gap-4 px-6 py-3 border-b border-border bg-secondary/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <span>Aluno</span>
          <span>Valor</span>
          <span>Vencimento</span>
          <span>Status</span>
          <span className="text-right">Ação</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !cobrancas || cobrancas.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={DollarSign}
              title="Sem cobranças neste mês"
              description='Clique em "Gerar cobranças" pra criar as mensalidades dos alunos ativos.'
            />
          </div>
        ) : cobrancasFiltradas.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma cobrança encontrada com esse filtro.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {cobrancasFiltradas.map((c) => (
              <div
                key={c.id}
                className="flex flex-col md:grid md:grid-cols-[1fr_140px_140px_140px_120px] gap-2 md:gap-4 px-4 md:px-6 py-4 md:items-center hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {c.alunos?.nome?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.alunos?.nome}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      Venc. {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-sm font-semibold tabular-nums">
                  {fmtBRL(Number(c.valor))}
                </span>

                <span className="text-sm text-muted-foreground hidden md:inline-block">
                  {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yyyy")}
                </span>

                <div>
                  <FinanceiroStatusBadge status={getCobrancaStatus(c)} />
                </div>

                <div className="md:text-right flex items-center justify-end gap-1.5">
                  {c.status === "pago" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReciboCobranca(c)}
                      aria-label="Gerar recibo"
                      title="Gerar recibo"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Recibo
                    </Button>
                  )}
                  {c.status !== "pago" && c.alunos?.telefone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openWhatsApp(
                          c.alunos.telefone!,
                          messageTemplates.lembreteCobranca(
                            c.alunos.nome.split(" ")[0],
                            professor?.nome?.split(" ")[0] ?? "Professor",
                            fmtBRL(Number(c.valor)),
                            format(
                              new Date(c.vencimento + "T00:00:00"),
                              "dd/MM/yyyy"
                            ),
                            professor?.chave_pix ?? undefined
                          ),
                          {
                            professorId: professor?.id,
                            alunoId: c.aluno_id,
                            tipo: "cobranca",
                          }
                        )
                      }
                      aria-label="Enviar cobrança via WhatsApp"
                      title="Enviar via WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {c.status !== "pago" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcarPagoMutation.mutate(c.id)}
                      disabled={marcarPagoMutation.isPending}
                      className="text-success border-success/30 hover:bg-success/10 hover:text-success"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Marcar pago
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {professor && (
        <ReciboModal
          open={!!reciboCobranca}
          onClose={() => setReciboCobranca(null)}
          cobranca={reciboCobranca}
          alunoNome={reciboCobranca?.alunos?.nome ?? ""}
          professor={professor}
        />
      )}
    </div>
  );
};

export default Financeiro;
