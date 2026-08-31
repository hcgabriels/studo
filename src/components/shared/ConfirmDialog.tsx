import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** "default" usa cor primary, "destructive" usa vermelho. Default: "default". */
  variant?: "default" | "destructive";
  /** Texto do botão de confirmação. Default: "Confirmar". */
  confirmLabel?: string;
  /** Label durante loading. Default: "Salvando…". */
  loadingLabel?: string;
  /** Texto do cancelar. Default: "Cancelar". */
  cancelLabel?: string;
  /** Controlado externamente (mutation.isPending). Desabilita os DOIS botões. */
  loading?: boolean;
  /**
   * Desabilita SÓ o botão de confirmar, deixando o cancelar clicável.
   *
   * Serve pra confirmação que exige um pré-requisito — digitar "EXCLUIR", por
   * exemplo. Com `loading` isso não dava: ele trava o cancelar junto, e o
   * usuário fica preso no dialog.
   */
  confirmDisabled?: boolean;
  /** Conteúdo extra entre a descrição e os botões (ex: campo de confirmação). */
  children?: ReactNode;
  /**
   * Chamado quando o user confirma. Pode ser sync ou async.
   * Se async, espera resolver antes de fechar o dialog.
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Dialog padrão pra confirmações (destrutivas ou não). Substitui o boilerplate
 * de Dialog + DialogHeader + DialogFooter + Button × 2 que se repete em cada
 * mutation que precisa confirm.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  confirmLabel = "Confirmar",
  loadingLabel = "Salvando…",
  cancelLabel = "Cancelar",
  loading = false,
  confirmDisabled = false,
  children,
  onConfirm,
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    const r = onConfirm();
    if (r && typeof (r as Promise<void>).then === "function") {
      try {
        await r;
      } finally {
        // Quem chamou já é responsável por fechar via onOpenChange se desejar.
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
