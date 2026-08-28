import { cn } from "@/lib/utils";

type InsightTone = "primary" | "info" | "success" | "warning" | "danger";

interface InsightBoxProps {
  title: string;
  description: string;
  tone?: InsightTone;
}

const borderClass: Record<InsightTone, string> = {
  primary: "border-l-primary",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-destructive",
};

/**
 * Insight box do painel de Relatórios.
 * Border-left 2px color-coded + título + descrição.
 * Especificação handoff: `Studoo Fase 3.html` linhas 1041-1054.
 */
export const InsightBox = ({
  title,
  description,
  tone = "primary",
}: InsightBoxProps) => (
  <div className={cn("pl-3.5 border-l-2", borderClass[tone])}>
    <p className="text-[13.5px] font-semibold text-foreground mb-1">{title}</p>
    <p className="text-[13px] text-muted-foreground leading-[1.55]">
      {description}
    </p>
  </div>
);
