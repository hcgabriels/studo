import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Check, AlertCircle } from "lucide-react";
import { format, differenceInDays, addMonths } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePacotesAluno } from "@/hooks/usePacotes";
import { invalidatePacotes } from "@/lib/queries";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, parseCurrencyInput } from "@/lib/masks";
import { fmtBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PacoteAulas } from "@/types/supabase";

const NovoPacoteModal = ({
  open,
  onClose,
  alunoId,
  professorId,
}: {
  open: boolean;
  onClose: () => void;
  alunoId: string;
  professorId: string;
}) => {
  const qc = useQueryClient();
  const [totalAulas, setTotalAulas] = useState("4");
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [validade, setValidade] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta defaults do form quando o modal reabre
      setTotalAulas("4");
      setValor("");
      setObservacao("");
      // Default: 3 meses a partir de hoje
      setValidade(format(addMonths(new Date(), 3), "yyyy-MM-dd"));
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pacotes_aulas").insert({
        aluno_id: alunoId,
        professor_id: professorId,
        total_aulas: parseInt(totalAulas),
        aulas_usadas: 0,
        valor_total: parseCurrencyInput(valor) / 100,
        status: "ativo",
        observacao: observacao || null,
        data_compra: new Date().toISOString().slice(0, 10),
        data_validade: validade || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePacotes(qc);
      toast.success("Pacote vendido!");
      onClose();
    },
    onError: () => toast.error("Erro ao criar pacote"),
  });

  const valid =
    parseInt(totalAulas) > 0 && parseCurrencyInput(valor) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vender pacote de aulas</DialogTitle>
          <DialogDescription>
            Crédito pré-pago de aulas avulsas. Decremente manualmente conforme
            uso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade de aulas</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={totalAulas}
                onChange={(e) => setTotalAulas(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor total</Label>
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

          <div className="space-y-1.5">
            <Label>Validade</Label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
              className="flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:border-primary/40"
            />
            <p className="text-xs text-muted-foreground">
              Padrão: 3 meses. Deixe em branco se não houver validade.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Forma de pagamento, condições..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando..." : "Confirmar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PacoteCard = ({ pacote }: { pacote: PacoteAulas }) => {
  const [confirmUsar, setConfirmUsar] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const qc = useQueryClient();
  const restantes = pacote.total_aulas - pacote.aulas_usadas;
  const pct = Math.round((pacote.aulas_usadas / pacote.total_aulas) * 100);
  const ativo = pacote.status === "ativo";
  const concluido = pacote.status === "concluido";

  const diasParaVencer = pacote.data_validade
    ? differenceInDays(
        new Date(pacote.data_validade + "T23:59:59"),
        new Date()
      )
    : null;
  const vencido = diasParaVencer !== null && diasParaVencer < 0;
  const venceLogo =
    diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 14;

  const usar = useMutation({
    mutationFn: async () => {
      // RPC atômica: o UPDATE roda com `WHERE aulas_usadas < total_aulas`, então
      // a invariante é garantida no servidor.
      //
      // Antes isso lia `pacote.aulas_usadas` da PROP (valor de cache) e gravava
      // +1. Com o app aberto em duas telas dentro da janela de cache, as duas
      // liam o mesmo número e gravavam o mesmo resultado — o aluno ganhava uma
      // aula de graça.
      const { error } = await supabase.rpc("usar_aula_pacote", {
        p_pacote_id: pacote.id,
      });
      if (!error) return;
      if (error.code !== "42883") throw error;

      console.warn(
        "RPC usar_aula_pacote ausente — rode sql/2026-08-lancamento.sql. Usando fallback não-atômico.",
      );
      const novasUsadas = pacote.aulas_usadas + 1;
      const novoStatus =
        novasUsadas >= pacote.total_aulas ? "concluido" : "ativo";
      const { error: errFallback } = await supabase
        .from("pacotes_aulas")
        .update({ aulas_usadas: novasUsadas, status: novoStatus })
        .eq("id", pacote.id);
      if (errFallback) throw errFallback;
    },
    onSuccess: () => {
      invalidatePacotes(qc);
      toast.success("Aula descontada do pacote");
    },
    onError: () => toast.error("Erro ao atualizar pacote"),
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pacotes_aulas")
        .update({ status: "cancelado" })
        .eq("id", pacote.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePacotes(qc);
      toast.success("Pacote cancelado");
    },
  });

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4",
        ativo ? "border-border" : "border-border/40 opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
>
              Pacote {pacote.total_aulas} aulas
            </p>
            <p className="text-xs text-muted-foreground">
              Comprado em{" "}
              {format(new Date(pacote.data_compra + "T00:00:00"), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <Badge
          variant={
            concluido ? "success" : pacote.status === "cancelado" ? "muted" : "default"
          }
        >
          {concluido ? "Concluído" : pacote.status === "cancelado" ? "Cancelado" : "Ativo"}
        </Badge>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {pacote.aulas_usadas} de {pacote.total_aulas} usadas
          </span>
          <span className="font-mono font-semibold">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              concluido ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Valor total</span>
        <span className="font-mono font-semibold text-sm tabular-nums">
          {fmtBRL(Number(pacote.valor_total))}
        </span>
      </div>

      {pacote.data_validade && ativo && (
        <div
          className={cn(
            "flex items-center justify-between mb-2 text-xs",
            vencido
              ? "text-destructive"
              : venceLogo
              ? "text-warning"
              : "text-muted-foreground"
          )}
        >
          <span className="inline-flex items-center gap-1">
            {(vencido || venceLogo) && <AlertCircle className="h-3 w-3" />}
            Validade
          </span>
          <span className="font-mono font-semibold">
            {vencido
              ? `Venceu há ${Math.abs(diasParaVencer!)} dia${Math.abs(diasParaVencer!) !== 1 ? "s" : ""}`
              : venceLogo
              ? `Vence em ${diasParaVencer} dia${diasParaVencer !== 1 ? "s" : ""}`
              : format(new Date(pacote.data_validade + "T00:00:00"), "dd/MM/yyyy")}
          </span>
        </div>
      )}

      {pacote.observacao && (
        <p className="text-xs text-muted-foreground mb-3">{pacote.observacao}</p>
      )}

      {ativo && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmUsar(true)}
            disabled={usar.isPending || restantes <= 0}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Usar 1 aula ({restantes})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmCancelar(true)}
            disabled={cancelar.isPending}
            className="text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmUsar}
        onOpenChange={setConfirmUsar}
        title="Descontar 1 aula do pacote?"
        description={`Vai sobrar ${Math.max(0, restantes - 1)} aula${
          restantes - 1 !== 1 ? "s" : ""
        } no pacote. Essa ação não tem desfazer.`}
        confirmLabel="Descontar aula"
        loadingLabel="Descontando…"
        loading={usar.isPending}
        onConfirm={() =>
          usar.mutate(undefined, {
            onSettled: () => setConfirmUsar(false),
          })
        }
      />

      <ConfirmDialog
        open={confirmCancelar}
        onOpenChange={setConfirmCancelar}
        title="Cancelar pacote?"
        description="O pacote será marcado como cancelado e não poderá mais ser usado. O histórico fica preservado."
        variant="destructive"
        confirmLabel="Cancelar pacote"
        cancelLabel="Voltar"
        loadingLabel="Cancelando…"
        loading={cancelar.isPending}
        onConfirm={() =>
          cancelar.mutate(undefined, {
            onSettled: () => setConfirmCancelar(false),
          })
        }
      />
    </div>
  );
};

export const PacotesTab = ({
  alunoId,
  professorId,
}: {
  alunoId: string;
  professorId: string;
}) => {
  const { data: pacotes, isLoading } = usePacotesAluno(alunoId);
  const [novoOpen, setNovoOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pacotes?.length ?? 0} pacote{pacotes?.length !== 1 ? "s" : ""}
          </p>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Vender pacote
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Carregando...
          </p>
        ) : !pacotes || pacotes.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhum pacote vendido</p>
            <p className="text-xs text-muted-foreground mt-1">
              Venda pacotes de aulas avulsas pré-pagas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pacotes.map((p) => (
              <PacoteCard key={p.id} pacote={p} />
            ))}
          </div>
        )}
      </div>

      <NovoPacoteModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        alunoId={alunoId}
        professorId={professorId}
      />
    </>
  );
};
