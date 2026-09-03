import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Music,
  MoreVertical,
  Mail,
  Phone,
  Users as UsersIcon,
  Clock,
  MessageSquare,
  Upload,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AlunoStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { FilterBar, FilterChip } from "@/components/shared/FilterBar";
import { AlunosTable } from "@/components/alunos/AlunosTable";
import { ColarAlunos } from "@/components/alunos/ColarAlunos";
import { AlunoForm } from "@/components/shared/AlunoForm";
import { NivelBadge } from "@/components/shared/NivelBadge";
import {
  useAulasRecorrentes,
  getHorariosDoAluno,
} from "@/hooks/useAulasRecorrentes";
import { invalidateAlunos } from "@/lib/queries";
import { useDebounced } from "@/hooks/useDebounced";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatPhone } from "@/lib/masks";
import { openWhatsApp, messageTemplates } from "@/lib/whatsapp";
import { type AlunoImportRow } from "@/lib/csv";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { cn } from "@/lib/utils";
import type { Aluno, Aula, Cobranca, AulaRecorrente } from "@/types/supabase";
import { track } from "@/lib/analytics";
import { fmtBRL } from "@/lib/format";
import { nomeDiaSemanaCurto } from "@/lib/constants";
import { buildAlunosImportRpcPayload } from "@/lib/domain/importacaoAlunos";

const AlunoCard = ({
  aluno,
  aulas,
  recorrentes,
  professorNome,
  professorId,
  onEdit,
  onToggleStatus,
  onExcluir,
}: {
  aluno: Aluno;
  aulas: Aula[];
  recorrentes: AulaRecorrente[];
  professorNome: string;
  professorId: string;
  onEdit: (a: Aluno) => void;
  onToggleStatus: (a: Aluno) => void;
  /** Exclusão definitiva (LGPD). Opcional pra não quebrar outros call-sites. */
  onExcluir?: (a: Aluno) => void;
}) => {
  const horarios = getHorariosDoAluno(aluno, recorrentes);
  const primeiroHorario = horarios[0];
  const horariosExtras = horarios.length - 1;
  const valorTotal = Number(aluno.valor_mensalidade);
  const ultimas = aulas
    .filter((a) => a.aluno_id === aluno.id)
    .slice(0, 4);
  const presentes = ultimas.filter((a) => a.status === "realizada").length;
  const freqPct = ultimas.length
    ? Math.round((presentes / ultimas.length) * 100)
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-colors hover:border-border/80 flex flex-col gap-4">
      {/* Header: avatar + nome + status + menu */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="font-mono text-sm font-semibold text-primary">
            {aluno.nome.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">
              {aluno.nome}
            </p>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Music className="h-3 w-3 shrink-0" />
            <span>{aluno.instrumento || "—"}</span>
            <NivelBadge nivel={aluno.nivel} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AlunoStatusBadge status={aluno.status as "ativo" | "inativo"} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Mais ações"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(aluno)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleStatus(aluno)}
                className={
                  aluno.status === "ativo" ? "text-warning" : "text-success"
                }
              >
                {aluno.status === "ativo" ? "Arquivar" : "Reativar"}
              </DropdownMenuItem>
              {onExcluir && (
                <DropdownMenuItem
                  onClick={() => onExcluir(aluno)}
                  className="text-destructive"
                >
                  Excluir de vez
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dados em key/value */}
      <div className="space-y-2 text-xs">
        {aluno.email_notificacao && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{aluno.email_notificacao}</span>
          </div>
        )}
        {aluno.telefone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono">{formatPhone(aluno.telefone)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {nomeDiaSemanaCurto(primeiroHorario.dia_semana)} ·{" "}
            {primeiroHorario.horario.slice(0, 5)}
            {horariosExtras > 0 && (
              <span className="text-primary font-medium">
                {" "}
                +{horariosExtras}
              </span>
            )}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {fmtBRL(valorTotal)}
          </span>
        </div>
        {freqPct !== null && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Frequência</span>
            <span
              className={cn(
                "font-mono font-semibold",
                freqPct >= 75
                  ? "text-success"
                  : freqPct >= 50
                  ? "text-warning"
                  : "text-destructive"
              )}
            >
              {freqPct}%
            </span>
          </div>
        )}
        {aluno.reposicoes_disponiveis > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Reposições</span>
            <span className="font-mono font-semibold text-success">
              {aluno.reposicoes_disponiveis} pendente
              {aluno.reposicoes_disponiveis !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          asChild
          variant="secondary"
          className="flex-1"
          size="sm"
        >
          <Link to={`/alunos/${aluno.id}`}>Ver perfil</Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={
            aluno.telefone ? "Enviar mensagem no WhatsApp" : "Sem telefone cadastrado"
          }
          disabled={!aluno.telefone}
          onClick={() =>
            aluno.telefone &&
            openWhatsApp(
              aluno.telefone,
              messageTemplates.saudacao(aluno.nome.split(" ")[0], professorNome),
              { professorId, alunoId: aluno.id, tipo: "saudacao" }
            )
          }
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const ImportarCsvModal = ({
  open,
  onClose,
  professorId,
  alunosExistentes,
}: {
  open: boolean;
  onClose: () => void;
  professorId: string;
  alunosExistentes: Aluno[];
}) => {
  const qc = useQueryClient();
  const [coladas, setColadas] = useState<AlunoImportRow[]>([]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa estado do importador CSV quando o modal reabre
      setColadas([]);
    }
  }, [open]);

  const efetivas = coladas;
  const validRows = efetivas.filter((r) => r.errors.length === 0 && !r.duplicado);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!professorId || validRows.length === 0) return;
      const alunos = buildAlunosImportRpcPayload(
        validRows,
        format(new Date(), "yyyy-MM-dd"),
      );
      const { error } = await supabase.rpc("importar_alunos", {
        p_professor_id: professorId,
        p_alunos: alunos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      qc.invalidateQueries({ queryKey: ["aulas-recorrentes"] });
      track("csv_import_concluido", { linhas: validRows.length });
      toast.success(`${validRows.length} aluno${validRows.length !== 1 ? "s" : ""} importado${validRows.length !== 1 ? "s" : ""}!`);
      onClose();
    },
    onError: () => toast.error("Erro ao importar alunos"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Trazer seus alunos</DialogTitle>
          <DialogDescription>
            Importe um CSV ou cole as linhas da planilha. O Studoo confere tudo
            antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ColarAlunos
            existentes={alunosExistentes}
            onChange={(linhas) => setColadas(linhas)}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={validRows.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Importando..."
              : validRows.length === 0
                ? "Importar"
                : `Importar ${validRows.length} aluno${validRows.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Alunos = () => {
  const { data: professor } = useProfessor();
  const { data: recorrentes } = useAulasRecorrentes(professor?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounced(busca, 200);
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    aluno: Aluno;
    action: "arquivar" | "reativar" | "excluir";
  } | null>(null);

  const { data: alunos, isLoading } = useQuery({
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

  // A lista só usa as últimas aulas de cada aluno (frequência do card) e a
  // cobrança mais recente. Sem `limit`, isso baixava o histórico inteiro do
  // professor — milhares de linhas depois de alguns anos de uso.
  const { data: aulas } = useQuery({
    queryKey: ["aulas-alunos", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .order("data_hora", { ascending: false })
        .limit(600);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const { data: cobrancas } = useQuery({
    queryKey: ["cobrancas-alunos", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*")
        .eq("professor_id", professor!.id)
        .order("mes_referencia", { ascending: false })
        .limit(600);
      if (error) throw error;
      return data as Cobranca[];
    },
    enabled: !!professor,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (aluno: Aluno) => {
      const novoStatus = aluno.status === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase
        .from("alunos")
        .update({ status: novoStatus })
        .eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      toast.success("Status atualizado!");
      setConfirmDialog(null);
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  /**
   * Exclusão definitiva do aluno (direito de eliminação da LGPD).
   *
   * Antes só existia "arquivar" — o professor não tinha como atender um pedido
   * de exclusão de dados de aluno, que muitas vezes é menor de idade.
   */
  const excluirAlunoMutation = useMutation({
    mutationFn: async (aluno: Aluno) => {
      const { error } = await supabase.rpc("excluir_aluno", {
        p_aluno_id: aluno.id,
      });
      if (!error) return;
      if (error.code !== "42883") throw error;

      console.warn(
        "RPC excluir_aluno ausente — rode sql/2026-08-lancamento.sql.",
      );
      throw new Error(
        "A exclusão ainda não está configurada no banco. Rode a migration de lançamento.",
      );
    },
    onSuccess: () => {
      invalidateAlunos(qc);
      qc.invalidateQueries({ queryKey: ["aulas-recorrentes"] });
      toast.success("Aluno e histórico excluídos.");
      setConfirmDialog(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erro ao excluir aluno"),
  });

  const filteredAlunos = useMemo(() => {
    if (!alunos) return [];
    const q = buscaDebounced.toLowerCase().trim();
    return alunos.filter((a) => {
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        a.instrumento.toLowerCase().includes(q) ||
        (a.email_notificacao?.toLowerCase().includes(q) ?? false) ||
        (a.telefone?.toLowerCase().includes(q) ?? false) ||
        (a.nome_responsavel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [alunos, buscaDebounced, statusFilter]);

  const ativos = alunos?.filter((a) => a.status === "ativo").length ?? 0;
  const inativos = (alunos?.length ?? 0) - ativos;

  usePage(
    "Alunos",
    `${ativos} ativo${ativos !== 1 ? "s" : ""} · ${inativos} arquivado${inativos !== 1 ? "s" : ""}`,
    "Cadastro",
  );

  const handleToggleStatus = (aluno: Aluno) => {
    setConfirmDialog({
      aluno,
      action: aluno.status === "ativo" ? "arquivar" : "reativar",
    });
  };

  const handleExcluir = (aluno: Aluno) => {
    setConfirmDialog({ aluno, action: "excluir" });
  };

  const handleEdit = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setFormOpen(true);
  };

  const exportarCsv = () => {
    if (!alunos || alunos.length === 0) {
      toast.error("Sem alunos pra exportar");
      return;
    }
    const csv = toCSV(
      [
        "Nome",
        "Instrumento",
        "Telefone",
        "Email",
        "Dia",
        "Horário",
        "Duração",
        "Mensalidade",
        "Status",
      ],
      alunos.map((a) => [
        a.nome,
        a.instrumento,
        a.telefone ?? "",
        a.email_notificacao ?? "",
        a.dia_semana === null
          ? ""
          : ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][a.dia_semana],
        a.horario?.slice(0, 5) ?? "",
        a.duracao_minutos,
        Number(a.valor_mensalidade).toFixed(2).replace(".", ","),
        a.status,
      ]),
    );
    downloadCSV(`alunos-${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
    toast.success("Lista exportada!");
  };

  const totalAtivos = ativos;
  const subtitleDesktop = isLoading
    ? "Carregando…"
    : `${totalAtivos} aluno${totalAtivos !== 1 ? "s" : ""} ativo${totalAtivos !== 1 ? "s" : ""} · ${inativos} arquivado${inativos !== 1 ? "s" : ""}`;

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 animate-fade-in-up">
      {/* Mobile header */}
      <div className="flex items-end justify-between mb-5 md:hidden">
        <PageHeadMobile
          eyebrow="Cadastro"
          title="Alunos"
          subtitle={isLoading ? "…" : `${totalAtivos} ativo${totalAtivos !== 1 ? "s" : ""}`}
          className="mb-0"
        />
        <Button onClick={() => { setEditingAluno(null); setFormOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo
        </Button>
      </div>

      {/* Desktop page-head */}
      <PageHead
        eyebrow={`Carteira ativa · ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}`}
        title="Alunos"
        subtitle={subtitleDesktop}
        actions={
          <>
            <Button variant="outline" onClick={exportarCsv}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importar
            </Button>
            <Button onClick={() => { setEditingAluno(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo aluno
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por nome, instrumento, email…"
        chips={
          <>
            <FilterChip
              label="Todos"
              value={String(alunos?.length ?? 0)}
              active={statusFilter === "todos"}
              onClick={() => setStatusFilter("todos")}
            />
            <FilterChip
              label="Ativos"
              value={String(ativos)}
              active={statusFilter === "ativo"}
              onClick={() => setStatusFilter("ativo")}
            />
            <FilterChip
              label="Arquivados"
              value={String(inativos)}
              active={statusFilter === "inativo"}
              onClick={() => setStatusFilter("inativo")}
            />
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : filteredAlunos.length === 0 ? (
        busca || statusFilter !== "todos" ? (
          <EmptyState
            icon={Search}
            title="Nenhum aluno encontrado"
            description={busca ? `Sem resultados para "${busca}".` : "Tente outro filtro."}
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="Você ainda não tem alunos"
            description="Cadastre seu primeiro aluno para começar a organizar a agenda e o financeiro."
            action={
              <Button onClick={() => { setEditingAluno(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar primeiro aluno
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Mobile: grid de cards (preserva pattern atual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredAlunos.map((aluno) => (
              <AlunoCard
                key={aluno.id}
                aluno={aluno}
                aulas={aulas ?? []}
                recorrentes={recorrentes ?? []}
                professorNome={professor?.nome?.split(" ")[0] ?? "Professor"}
                professorId={professor?.id ?? ""}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onExcluir={handleExcluir}
              />
            ))}
          </div>

          {/* Desktop: alunos-table */}
          <div className="hidden md:block">
            <AlunosTable
              alunos={filteredAlunos}
              cobrancas={cobrancas ?? []}
              recorrentes={recorrentes ?? []}
              onClick={(a) => navigate(`/alunos/${a.id}`)}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
            />
            <div className="px-[18px] py-3.5 bg-card border border-border border-t-0 rounded-b-xl flex items-center justify-between font-mono text-[11.5px] text-muted-foreground -mt-px">
              <span>
                {filteredAlunos.length} aluno{filteredAlunos.length !== 1 ? "s" : ""}
              </span>
              {/* Antes era "Página 1 / 1" hardcoded — parecia paginação
                  quebrada. A lista não pagina; o filtro é a navegação. */}
              <span>
                {filteredAlunos.length === alunos?.length
                  ? "todos os alunos"
                  : `filtrando ${filteredAlunos.length} de ${alunos?.length ?? 0}`}
              </span>
            </div>
          </div>
        </>
      )}

      <AlunoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        professorId={professor?.id ?? ""}
        editingAluno={editingAluno}
        recorrentes={recorrentes ?? []}
      />

      <ImportarCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        professorId={professor?.id ?? ""}
        alunosExistentes={alunos ?? []}
      />

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(v) => !v && setConfirmDialog(null)}
        title={
          confirmDialog?.action === "excluir"
            ? "Excluir aluno de vez"
            : confirmDialog?.action === "arquivar"
              ? "Arquivar aluno"
              : "Reativar aluno"
        }
        description={
          confirmDialog?.action === "excluir"
            ? `Isso apaga ${confirmDialog.aluno.nome} e tudo que veio junto: horários, cobranças, pacotes e mensagens. As aulas já registradas ficam na agenda sem vínculo. Não dá pra desfazer — se você só quer tirar da agenda, use Arquivar.`
            : confirmDialog?.action === "arquivar"
              ? `Tem certeza que deseja arquivar ${confirmDialog.aluno.nome}? O aluno não aparecerá mais na agenda, mas o histórico será mantido.`
              : `Deseja reativar ${confirmDialog?.aluno.nome}?`
        }
        variant={
          confirmDialog?.action === "reativar" ? "default" : "destructive"
        }
        confirmLabel={
          confirmDialog?.action === "excluir"
            ? "Excluir de vez"
            : confirmDialog?.action === "arquivar"
              ? "Arquivar"
              : "Reativar"
        }
        loading={
          toggleStatusMutation.isPending || excluirAlunoMutation.isPending
        }
        onConfirm={() => {
          if (!confirmDialog) return;
          if (confirmDialog.action === "excluir") {
            excluirAlunoMutation.mutate(confirmDialog.aluno);
          } else {
            toggleStatusMutation.mutate(confirmDialog.aluno);
          }
        }}
      />
    </div>
  );
};

export default Alunos;
