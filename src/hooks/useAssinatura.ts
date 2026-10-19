import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Assinatura } from "@/types/supabase";

export const useAssinatura = (
  professorId?: string,
  options?: Pick<UseQueryOptions<Assinatura | null>, "refetchInterval">,
) =>
  useQuery({
    queryKey: ["assinatura", professorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("professor_id", professorId!)
        .maybeSingle();
      if (error) throw error;
      return data as Assinatura | null;
    },
    enabled: !!professorId,
    refetchInterval: options?.refetchInterval ?? false,
  });
