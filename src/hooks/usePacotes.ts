import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PacoteAulas } from "@/types/supabase";

export const usePacotesAluno = (alunoId?: string) => {
  return useQuery({
    queryKey: ["pacotes-aluno", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacotes_aulas")
        .select("*")
        .eq("aluno_id", alunoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PacoteAulas[];
    },
    enabled: !!alunoId,
  });
};
