import { cn } from "@/lib/utils";
import { useProfessor } from "@/hooks/useProfessor";
import { useAssinatura } from "@/hooks/useAssinatura";
import { emTesteGratis, jaAssinou } from "@/lib/domain/assinatura";

/**
 * Selo ao lado do logo. Antes dizia "Pro" pra todo mundo, inclusive pra quem
 * estava no teste grátis. Agora segue o plano: "Pro" com assinatura, "Teste"
 * durante o teste grátis, nada nos outros casos.
 */
export const PlanoBadge = ({ className }: { className?: string }) => {
  const { data: professor } = useProfessor();
  const { data: assinatura } = useAssinatura(professor?.id);

  const texto = jaAssinou(assinatura) ? "Pro" : emTesteGratis(assinatura) ? "Teste" : null;
  if (!texto) return null;

  return (
    <span
      className={cn(
        "font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground border border-border rounded-sm px-1.5 py-0.5",
        className,
      )}
    >
      {texto}
    </span>
  );
};
