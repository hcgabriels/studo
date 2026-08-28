import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { identificar } from "@/lib/analytics";
import type { Professor } from "@/types/supabase";

export type { Professor };

export const useProfessor = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["professor", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const professor = (data ?? null) as Professor | null;
      // Amarra os eventos ao professor (id interno, não o email).
      if (professor) identificar(professor.id);
      return professor;
    },
    enabled: !!user,
    retry: 1,
  });
};
