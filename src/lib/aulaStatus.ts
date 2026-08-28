/**
 * Vocabulário único de status de aula.
 *
 * Existiam 5 mapas paralelos (StatusBadge, AgendaDia, AgendaMensal, Agenda,
 * AlunoDetalhe) com rótulos divergentes pro mesmo estado — "Presente" numa tela
 * e "Realizada" na outra, "Falta s/ aviso" / "Falta sem aviso" / "Falta".
 * Aqui fica a fonte da verdade: rótulo, variante de Badge, variante de
 * StatusIcon e classes de cor.
 */
import type { BadgeProps } from "@/components/ui/badge";
import type { StatusVariant } from "@/components/shared/StatusIcon";

export type AulaStatus =
  | "agendada"
  | "realizada"
  | "falta_justificada"
  | "falta_sem_aviso"
  | "cancelada_professor"
  | "reagendada";

/** Variantes aceitas pelo `<Badge>` (exclui `null | undefined` do cva). */
type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export interface AulaStatusMeta {
  value: AulaStatus;
  /** Rótulo por extenso — badges, selects, tooltips. */
  label: string;
  /** Rótulo curto — colunas de tabela e listas densas. */
  labelCurto: string;
  /** Variante do `<Badge>`. */
  variant: BadgeVariant;
  /** Variante do `<StatusIcon>`. */
  iconVariant: StatusVariant;
  /** Classes de cor (fundo/texto) pra chips e células fora do Badge. */
  tone: string;
}

export const AULA_STATUS: Record<AulaStatus, AulaStatusMeta> = {
  agendada: {
    value: "agendada",
    label: "Agendada",
    labelCurto: "Agendada",
    variant: "default",
    iconVariant: "neutral",
    tone: "bg-primary-soft text-primary",
  },
  realizada: {
    value: "realizada",
    label: "Presente",
    labelCurto: "Presente",
    variant: "success",
    iconVariant: "ok",
    tone: "bg-success-soft text-success",
  },
  falta_justificada: {
    value: "falta_justificada",
    label: "Falta justificada",
    labelCurto: "Falta just.",
    variant: "warning",
    iconVariant: "warn",
    tone: "bg-warning-soft text-warning",
  },
  falta_sem_aviso: {
    value: "falta_sem_aviso",
    label: "Falta sem aviso",
    labelCurto: "Falta",
    variant: "destructive",
    iconVariant: "danger",
    tone: "bg-destructive-soft text-destructive",
  },
  cancelada_professor: {
    value: "cancelada_professor",
    label: "Cancelada por você",
    labelCurto: "Cancelada",
    variant: "muted",
    iconVariant: "neutral",
    tone: "bg-muted text-muted-foreground",
  },
  reagendada: {
    value: "reagendada",
    label: "Reagendada",
    labelCurto: "Reagendada",
    variant: "secondary",
    iconVariant: "info",
    tone: "bg-info-soft text-info",
  },
};

/** True quando a string é um `AulaStatus` conhecido. */
export const isAulaStatus = (status: unknown): status is AulaStatus =>
  typeof status === "string" && status in AULA_STATUS;

/**
 * Meta do status, tolerante a valor ausente ou desconhecido.
 * Sem registro no banco a aula ainda está apenas agendada — esse é o fallback.
 */
export const getAulaStatusMeta = (status?: string | null): AulaStatusMeta =>
  isAulaStatus(status) ? AULA_STATUS[status] : AULA_STATUS.agendada;
