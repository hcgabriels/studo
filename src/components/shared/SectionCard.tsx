import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconTone = "default" | "success" | "warning" | "destructive" | "info";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  iconTone?: IconTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Padding no body (default true). Use false quando o children renderiza linhas com border próprio. */
  bodyPadding?: boolean;
  /** Conteúdo do rodapé (renderizado abaixo do body com border-top). */
  footer?: ReactNode;
}

const iconToneStyles: Record<IconTone, string> = {
  default: "bg-primary-soft text-primary border-primary-ring",
  success:
    "bg-[hsl(var(--success)/0.14)] text-success border-success/25",
  warning:
    "bg-[hsl(var(--warning)/0.14)] text-warning border-warning/25",
  destructive:
    "bg-[hsl(var(--destructive)/0.14)] text-destructive border-destructive/25",
  info: "bg-[hsl(var(--info)/0.14)] text-info border-info/25",
};

/**
 * Section card pattern Studoo (`.card` + `.card-head` + `.card-body`).
 * Especificação `studoo.css` linhas 615-652.
 */
export const SectionCard = ({
  title,
  description,
  icon: Icon,
  iconTone = "default",
  action,
  children,
  className,
  bodyPadding = true,
  footer,
}: SectionCardProps) => (
  <div
    className={cn(
      "bg-card border border-border rounded-xl overflow-hidden",
      className,
    )}
  >
    {(title || action) && (
      <div className="flex items-center gap-3.5 px-[22px] py-[18px] border-b border-border/60">
        {Icon && (
          <div
            className={cn(
              "h-9 w-9 rounded-md flex items-center justify-center shrink-0 border",
              iconToneStyles[iconTone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex flex-col gap-0.5">
          {title && (
            <h3 className="text-[15px] font-semibold leading-tight tracking-[-0.01em] truncate">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[12.5px] text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>
        {action && <div className="ml-auto flex items-center gap-1.5 shrink-0">{action}</div>}
      </div>
    )}
    <div className={cn(bodyPadding && "px-[22px] py-5")}>{children}</div>
    {footer && (
      <div className="px-[22px] py-3.5 border-t border-border/60 flex items-center gap-2.5">
        {footer}
      </div>
    )}
  </div>
);
