import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AulaRecorrente } from "@/types/supabase";

export const useAulasRecorrentes = (professorId?: string) => {
  return useQuery({
    queryKey: ["aulas-recorrentes", professorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas_recorrentes")
        .select("*")
        .eq("professor_id", professorId!)
        .eq("ativo", true);
      if (error) throw error;
      return data as AulaRecorrente[];
    },
    enabled: !!professorId,
  });
};

// Reexporta as funções puras (agora em `lib/domain/horarios`) pra manter os
// imports existentes funcionando.
export {
  getHorariosDoAluno,
  nextAulaAfter,
  type HorarioRecorrente,
} from "@/lib/domain/horarios";
