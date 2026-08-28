import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toDateOnly } from "@/lib/dates";
import type { BloqueioData } from "@/types/supabase";

export const useBloqueios = (professorId?: string) => {
  return useQuery({
    queryKey: ["bloqueios", professorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bloqueios_data")
        .select("*")
        .eq("professor_id", professorId!)
        .order("data", { ascending: true });
      if (error) throw error;
      return data as BloqueioData[];
    },
    enabled: !!professorId,
  });
};

/**
 * Predicado "esse dia está bloqueado?" já memoizado.
 *
 * Cada tela montava o próprio Set de datas; centralizar evita divergência
 * (o Painel, por exemplo, ignorava bloqueios e sugeria aula em feriado).
 */
export const useDiaBloqueado = (bloqueios?: BloqueioData[]) => {
  const datas = useMemo(
    () => new Set((bloqueios ?? []).map((b) => b.data.slice(0, 10))),
    [bloqueios],
  );
  return useMemo(
    () => (d: Date) => datas.has(toDateOnly(d)),
    [datas],
  );
};
