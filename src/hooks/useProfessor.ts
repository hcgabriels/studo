import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { identificar } from "@/lib/analytics";
import type { Professor } from "@/types/supabase";

export type { Professor };

const nomeDoUsuario = (user: User) => {
  const meta = user.user_metadata;
  const nome =
    meta?.nome ?? meta?.full_name ?? meta?.name ?? user.email?.split("@")[0];
  return String(nome ?? "Professor").trim() || "Professor";
};

const criarPerfilProfessor = async (user: User): Promise<Professor> => {
  const { data, error } = await supabase
    .from("professores")
    .insert({
      user_id: user.id,
      nome: nomeDoUsuario(user),
      email: user.email ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Professor;
};

export const useProfessor = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["professor", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1);
      if (error) throw error;
      let professor = ((data?.[0] as Professor | undefined) ?? null);
      if (!professor) {
        professor = await criarPerfilProfessor(user!);
      }
      // Amarra os eventos ao professor (id interno, não o email).
      if (professor) identificar(professor.id);
      return professor;
    },
    enabled: !!user,
    retry: 1,
  });
};
