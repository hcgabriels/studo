import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtBRL } from "@/lib/format";
import type { Cobranca, Professor } from "@/types/supabase";

interface ReciboModalProps {
  open: boolean;
  onClose: () => void;
  cobranca: Cobranca | null;
  alunoNome: string;
  professor: Professor;
}

const valorPorExtenso = (v: number) => {
  const reais = Math.floor(v);
  const centavos = Math.round((v - reais) * 100);
  const formattedReais = reais.toLocaleString("pt-BR");
  if (centavos === 0) {
    return `${formattedReais} reais`;
  }
  return `${formattedReais} reais e ${centavos.toString().padStart(2, "0")} centavos`;
};

export const ReciboModal = ({
  open,
  onClose,
  cobranca,
  alunoNome,
  professor,
}: ReciboModalProps) => {
  if (!cobranca) return null;

  const numero = cobranca.id.slice(0, 8).toUpperCase();
  const valor = Number(cobranca.valor);
  const mesRef = format(new Date(cobranca.mes_referencia + "T00:00:00"), "MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const dataPgto = cobranca.data_pagamento
    ? format(new Date(cobranca.data_pagamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" aria-label="Recibo de pagamento">
        <DialogHeader className="no-print">
          <div className="flex items-start justify-between w-full gap-3">
            <DialogTitle>Recibo de pagamento</DialogTitle>
            <Button onClick={handlePrint} size="sm" className="shrink-0">
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </DialogHeader>

        <DialogBody>
        {/* Recibo (área imprimível) */}
        <div className="print-area text-foreground">
          <div className="flex items-start justify-between mb-8 border-b border-border pb-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Recibo nº
              </p>
              <p className="text-lg font-bold font-mono">{numero}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Emitido em
              </p>
              <p className="text-sm font-medium">{hoje}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-6">
            Recebi de <strong>{alunoNome}</strong>, a importância de{" "}
            <strong>{fmtBRL(valor)}</strong>{" "}
            <span className="text-muted-foreground">
              ({valorPorExtenso(valor)})
            </span>
            , referente à mensalidade de aulas de música do mês de{" "}
            <strong className="first-letter:uppercase inline-block">{mesRef}</strong>.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Valor
              </p>
              <p className="font-semibold font-mono">{fmtBRL(valor)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Data do pagamento
              </p>
              <p className="font-semibold first-letter:uppercase">{dataPgto}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Pagador
              </p>
              <p className="font-semibold">{alunoNome}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Referência
              </p>
              <p className="font-semibold first-letter:uppercase">{mesRef}</p>
            </div>
          </div>

          {/* Quitação */}
          <div className="bg-muted/40 rounded-lg p-4 mb-8">
            <p className="text-sm leading-relaxed">
              Para clareza e devida quitação, firmo o presente recibo, dando plena
              e geral quitação ao pagador referente ao valor e período acima
              descritos.
            </p>
          </div>

          {/* Assinatura do professor */}
          <div className="border-t border-border pt-6 mt-12">
            <div className="text-center max-w-sm mx-auto">
              <div className="border-b border-foreground/40 mb-2 pb-12" />
              <p className="font-semibold">{professor.nome}</p>
              {professor.cpf_cnpj && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  CPF/CNPJ: {professor.cpf_cnpj}
                </p>
              )}
              {professor.endereco && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {professor.endereco}
                </p>
              )}
              {professor.email && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {professor.email}
                </p>
              )}
            </div>
          </div>
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
