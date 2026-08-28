import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAulaStatusMeta, type AulaStatus } from "@/lib/aulaStatus";

type FinanceiroStatus = "pago" | "pendente" | "atrasado";
type AlunoStatus = "ativo" | "inativo";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const dotColor: Record<BadgeVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
  default: "bg-primary",
  secondary: "bg-foreground/60",
  info: "bg-info",
  outline: "bg-foreground/60",
};

const StatusDotBadge = ({
  label,
  variant,
  pulse = false,
}: {
  label: string;
  variant: BadgeVariant;
  pulse?: boolean;
}) => (
  <Badge variant={variant} className="gap-1.5">
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60 animate-ping",
            dotColor[variant],
          )}
        />
      )}
      <span className={cn("relative h-1.5 w-1.5 rounded-full", dotColor[variant])} />
    </span>
    {label}
  </Badge>
);

const financeiroMap: Record<
  FinanceiroStatus,
  { label: string; variant: BadgeVariant; pulse?: boolean }
> = {
  pago: { label: "Pago", variant: "success" },
  pendente: { label: "Pendente", variant: "warning" },
  atrasado: { label: "Atrasado", variant: "destructive", pulse: true },
};

const alunoMap: Record<AlunoStatus, { label: string; variant: BadgeVariant }> = {
  ativo: { label: "Ativo", variant: "success" },
  inativo: { label: "Inativo", variant: "muted" },
};

export const FinanceiroStatusBadge = ({ status }: { status: FinanceiroStatus }) => (
  <StatusDotBadge {...financeiroMap[status]} />
);

export const AulaStatusBadge = ({ status }: { status: AulaStatus }) => {
  const meta = getAulaStatusMeta(status);
  return <StatusDotBadge label={meta.label} variant={meta.variant} />;
};

export const AlunoStatusBadge = ({ status }: { status: AlunoStatus }) => (
  <StatusDotBadge {...alunoMap[status]} />
);
