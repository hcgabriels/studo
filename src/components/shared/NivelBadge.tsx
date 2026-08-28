import { Badge } from "@/components/ui/badge";
import type { AlunoNivel } from "@/types/supabase";

interface NivelBadgeProps {
  nivel: AlunoNivel | null | undefined;
  className?: string;
}

/**
 * Badge de nível do aluno.
 * - Iniciante: cinza (token `muted`)
 * - Intermediário: azul (token `info`)
 * - Avançado: verde (token `success`)
 * Retorna null se `nivel` é nulo/undefined — facilita uso condicional inline.
 */
export const NivelBadge = ({ nivel, className }: NivelBadgeProps) => {
  if (!nivel) return null;

  if (nivel === "Iniciante") {
    return (
      <Badge variant="muted" className={className}>
        Iniciante
      </Badge>
    );
  }

  if (nivel === "Avançado") {
    return (
      <Badge variant="success" className={className}>
        Avançado
      </Badge>
    );
  }

  // Intermediário — azul do tema (`--info`), já resolvido em light e dark.
  // Era `bg-sky-500/15 text-sky-600` cru: cor fora da paleta e, sem variant,
  // herdava a borda âmbar do default.
  return (
    <Badge variant="info" className={className}>
      Intermediário
    </Badge>
  );
};
